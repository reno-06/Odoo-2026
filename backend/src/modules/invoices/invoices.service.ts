import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { ListQueryDto } from '../../common/validation/list-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { TenantCrudService } from '../../common/services/tenant-crud.service';
import { createInvoicePdf } from './invoice-pdf';

@Injectable()
export class InvoicesService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'invoice',
      fields: [
        'invoiceNumber', 'customerId', 'subscriptionId', 'quotationId',
        'issueDate', 'dueDate', 'status', 'currency', 'subtotal', 'taxTotal',
        'total', 'notes',
      ],
      searchFields: ['invoiceNumber', 'status'],
      filterFields: ['customerId', 'subscriptionId'],
      include: { customer: true, items: true, payments: true },
    });
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const customerId = await this.customerIdFromInput(workspaceId, input);
    const items = await this.normalizeItems(workspaceId, input);
    const totals = this.calculate(items);
    const issueDate = this.dateValue(input.issueDate ?? new Date().toISOString(), 'issueDate');
    const dueDate = this.dateValue(
      input.dueDate ?? new Date(Date.now() + 14 * 86400000).toISOString(),
      'dueDate',
    );
    if (dueDate < issueDate) {
      throw new BadRequestException('dueDate cannot be earlier than issueDate.');
    }
    const status = String(input.status ?? 'draft').toLowerCase();
    if (!['draft', 'confirmed', 'overdue', 'cancelled'].includes(status)) {
      throw new BadRequestException('Invoice status is invalid; payments set paid status.');
    }
    const invoice = await this.db.invoice.create({
      data: {
        workspaceId,
        invoiceNumber: `INV-${new Date().getFullYear()}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`,
        customerId,
        ...(typeof input.subscriptionId === 'string'
          ? { subscriptionId: input.subscriptionId }
          : {}),
        ...(typeof input.quotationId === 'string'
          ? { quotationId: input.quotationId }
          : {}),
        issueDate,
        dueDate,
        status,
        currency: String(input.currency ?? 'USD').toUpperCase(),
        ...totals,
        notes: typeof input.notes === 'string' ? input.notes : null,
        items: { create: items },
      },
      include: { customer: true, items: true, payments: true },
    });
    return { data: invoice };
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const current = await this.db.invoice.findFirst({ where: { id, workspaceId } });
    if (!current) throw new NotFoundException('Invoice not found.');
    if (current.status !== 'draft') {
      throw new ConflictException('Only draft invoices can be edited.');
    }
    const customerId =
      input.customerId || input.customer || input.name
        ? await this.customerIdFromInput(workspaceId, input)
        : current.customerId;
    const issueDate = input.issueDate
      ? this.dateValue(input.issueDate, 'issueDate')
      : current.issueDate;
    const dueDate = input.dueDate
      ? this.dateValue(input.dueDate, 'dueDate')
      : current.dueDate;
    if (dueDate < issueDate) {
      throw new BadRequestException('dueDate cannot be earlier than issueDate.');
    }

    let items;
    let totals;
    if (input.items !== undefined || input.total !== undefined || input.unitPrice !== undefined) {
      items = await this.normalizeItems(workspaceId, input);
      totals = this.calculate(items);
    }
    const data: Prisma.InvoiceUpdateInput = {
      customer: { connect: { id: customerId } },
      issueDate,
      dueDate,
      ...(typeof input.notes === 'string' ? { notes: input.notes } : {}),
      ...(typeof input.currency === 'string' ? { currency: input.currency.toUpperCase() } : {}),
      ...(totals ?? {}),
    };
    if (items) {
      await this.db.$transaction(async (transaction) => {
        await transaction.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await transaction.invoice.update({
          where: { id },
          data: { ...data, items: { create: items } },
        });
      });
    } else {
      await this.db.invoice.update({ where: { id }, data });
    }
    return this.get(context, id);
  }

  async issue(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    const invoice = await this.db.invoice.findFirst({ where: { id, workspaceId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (invoice.status !== 'draft') {
      throw new ConflictException('Only draft invoices can be issued.');
    }
    if (invoice.dueDate < invoice.issueDate) {
      throw new BadRequestException('Invoice due date cannot be before its issue date.');
    }
    return {
      data: await this.db.invoice.update({
        where: { id },
        data: { status: 'confirmed' },
        include: { customer: true, items: true, payments: true },
      }),
    };
  }

  async markPaid(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    return this.db.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM invoices WHERE id = ${id}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`,
      );
      if (!locked.length) throw new NotFoundException('Invoice not found.');
      const invoice = await transaction.invoice.findFirst({
        where: { id, workspaceId },
        include: { payments: { where: { status: 'completed' } } },
      });
      if (!invoice) throw new NotFoundException('Invoice not found.');
      if (invoice.status === 'cancelled' || invoice.status === 'draft') {
        throw new ConflictException('Only issued invoices can be marked paid.');
      }
      const paid = invoice.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const remaining = invoice.total.sub(paid);
      if (remaining.lte(0)) return { data: invoice };
      await transaction.payment.create({
        data: {
          workspaceId,
          paymentNumber: `PAY-${new Date().getFullYear()}-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          createdById: context.userId,
          amount: remaining,
          currency: invoice.currency,
          method: 'other',
          status: 'completed',
          paidAt: new Date(),
        },
      });
      await transaction.invoice.update({
        where: { id },
        data: { status: 'paid' },
      });
      return {
        data: await transaction.invoice.findUniqueOrThrow({
          where: { id },
          include: { customer: true, items: true, payments: true },
        }),
      };
    });
  }

  async pdf(context: AuthenticatedContext, id: string): Promise<Buffer> {
    const workspaceId = this.requireWorkspace(context);
    const invoice = await this.db.invoice.findFirst({
      where: { id, workspaceId },
      include: { customer: true, items: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    return createInvoicePdf(invoice, workspace);
  }

  private async customerIdFromInput(
    workspaceId: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    if (typeof input.customerId === 'string') {
      const customer = await this.db.customer.findFirst({
        where: { id: input.customerId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Customer is not in this workspace.');
      return customer.id;
    }
    const name = input.customer ?? input.name;
    if (typeof name !== 'string') {
      throw new BadRequestException('customerId is required.');
    }
    const customer = await this.db.customer.findFirst({
      where: { workspaceId, name, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Selected customer was not found.');
    return customer.id;
  }

  private async normalizeItems(
    workspaceId: string,
    input: Record<string, unknown>,
  ): Promise<Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]> {
    let rows = input.items;
    if (!Array.isArray(rows) && input.total !== undefined) {
      rows = [{
        description: 'Invoice charge',
        quantity: 1,
        unitPrice: input.total,
        taxRate: 0,
      }];
    }
    if (!Array.isArray(rows) && input.unitPrice !== undefined) {
      rows = [{
        description: String(input.product ?? 'Invoice item'),
        quantity: input.quantity ?? 1,
        unitPrice: input.unitPrice,
        taxRate: input.tax ?? 0,
      }];
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('At least one invoice item or total is required.');
    }
    const taxSettings = await this.db.workspaceTaxSettings.findUnique({
      where: { workspaceId },
      select: { taxRate: true },
    });
    return Promise.all(
      rows.map(async (raw) => {
        if (!raw || typeof raw !== 'object') {
          throw new BadRequestException('Invoice items must be objects.');
        }
        const row = raw as Record<string, unknown>;
        const productId = typeof row.productId === 'string' ? row.productId : undefined;
        const planId = typeof row.planId === 'string' ? row.planId : undefined;
        if (productId && planId) {
          throw new BadRequestException('An invoice item cannot reference both a product and plan.');
        }
        let description = String(row.description ?? 'Invoice item');
        if (productId) {
          const product = await this.db.product.findFirst({
            where: { id: productId, workspaceId, deletedAt: null },
          });
          if (!product) throw new NotFoundException('Invoice product was not found.');
          description = String(row.description ?? product.name);
        }
        if (planId) {
          const plan = await this.db.plan.findFirst({
            where: { id: planId, workspaceId, deletedAt: null },
          });
          if (!plan) throw new NotFoundException('Invoice plan was not found.');
          description = String(row.description ?? plan.name);
        }
        const quantity = Number(row.quantity ?? 1);
        const unitPrice = new Prisma.Decimal(String(row.unitPrice ?? 0));
        const taxRate = new Prisma.Decimal(
          String(row.taxRate ?? input.tax ?? taxSettings?.taxRate ?? 0),
        );
        if (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          unitPrice.isNegative() ||
          taxRate.isNegative() ||
          taxRate.gt(100)
        ) {
          throw new BadRequestException('Invoice item quantity, price, or tax is invalid.');
        }
        const lineSubtotal = unitPrice.mul(quantity).toDecimalPlaces(2);
        const taxAmount = lineSubtotal.mul(taxRate).div(100).toDecimalPlaces(2);
        return {
          workspaceId,
          ...(productId ? { productId } : {}),
          ...(planId ? { planId } : {}),
          descriptionSnapshot: description,
          quantity,
          unitPrice,
          taxRate,
          lineSubtotal,
          taxAmount,
          lineTotal: lineSubtotal.add(taxAmount),
        };
      }),
    );
  }

  private calculate(items: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]) {
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.lineSubtotal as Prisma.Decimal),
      new Prisma.Decimal(0),
    );
    const taxTotal = items.reduce(
      (sum, item) => sum.add(item.taxAmount as Prisma.Decimal),
      new Prisma.Decimal(0),
    );
    return { subtotal, taxTotal, total: subtotal.add(taxTotal) };
  }

  private dateValue(value: unknown, field: string): Date {
    if (typeof value !== 'string') throw new BadRequestException(`${field} is required.`);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException(`${field} is invalid.`);
    return date;
  }
}
