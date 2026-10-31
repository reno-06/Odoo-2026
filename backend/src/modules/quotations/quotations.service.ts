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

type QuoteItemInput = {
  productId?: string;
  planId?: string;
  description?: string;
  quantity: number;
  unitPrice: number | string;
  taxRate?: number | string;
};

@Injectable()
export class QuotationsService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'quotation',
      fields: [
        'quoteNumber', 'customerId', 'createdById', 'createdOn', 'validUntil',
        'status', 'currency', 'subtotal', 'taxTotal', 'total', 'notes',
      ],
      searchFields: ['quoteNumber', 'status'],
      filterFields: ['customerId'],
      include: { customer: true, items: true },
    });
  }

  override async list(context: AuthenticatedContext, query: ListQueryDto) {
    return super.list(context, query);
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const customerId = await this.customerIdFromInput(workspaceId, input);
    const items = await this.normalizeItems(workspaceId, input);
    const totals = this.calculate(items);
    const createdOn = input.createdOn
      ? new Date(String(input.createdOn))
      : input.created
        ? new Date(String(input.created))
        : new Date();
    const validUntil = this.dateValue(input.validUntil, 'validUntil');
    this.validateDateOrder(createdOn, validUntil);
    const quoteNumber = `QUO-${new Date().getFullYear()}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;
    const status = this.normalizeStatus(input.status ?? 'draft');
    const quotation = await this.db.quotation.create({
      data: {
        workspaceId,
        quoteNumber,
        customerId,
        createdById: context.userId,
        createdOn,
        validUntil,
        status,
        currency: String(input.currency ?? 'USD').toUpperCase(),
        ...totals,
        notes: typeof input.notes === 'string' ? input.notes : null,
        items: { create: items },
      },
      include: { customer: true, items: true },
    });
    return { data: quotation };
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const current = await this.db.quotation.findFirst({
      where: { id, workspaceId },
      include: { items: true },
    });
    if (!current) throw new NotFoundException('Quotation not found.');
    if (current.status !== 'draft') {
      throw new ConflictException('Only draft quotations can be edited.');
    }

    const data: Prisma.QuotationUpdateInput = {};
    if (input.customerId || input.customer || input.name) {
      const customerId = await this.customerIdFromInput(workspaceId, input);
      data.customer = { connect: { id: customerId } };
    }
    if (input.validUntil) {
      const validUntil = this.dateValue(input.validUntil, 'validUntil');
      this.validateDateOrder(current.createdOn, validUntil);
      data.validUntil = validUntil;
    }
    if (typeof input.notes === 'string') data.notes = input.notes;
    if (typeof input.currency === 'string') {
      data.currency = input.currency.toUpperCase();
    }
    if (input.items !== undefined || input.product !== undefined) {
      const items = await this.normalizeItems(workspaceId, input);
      const totals = this.calculate(items);
      data.subtotal = totals.subtotal;
      data.taxTotal = totals.taxTotal;
      data.total = totals.total;
      await this.db.$transaction(async (transaction) => {
        await transaction.quotationItem.deleteMany({ where: { quotationId: id } });
        await transaction.quotation.update({
          where: { id },
          data: { ...data, items: { create: items } },
        });
      });
    } else {
      await this.db.quotation.update({ where: { id }, data });
    }
    return this.get(context, id);
  }

  async confirm(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    const quote = await this.db.quotation.findFirst({
      where: { id, workspaceId },
    });
    if (!quote) throw new NotFoundException('Quotation not found.');
    if (quote.status !== 'draft' && quote.status !== 'quotation') {
      throw new ConflictException('Only draft quotations can be confirmed.');
    }
    if (quote.validUntil < new Date(new Date().toDateString())) {
      throw new ConflictException('Expired quotations cannot be confirmed.');
    }
    const updated = await this.db.quotation.update({
      where: { id },
      data: { status: 'confirmed' },
      include: { customer: true, items: true },
    });
    return { data: updated };
  }

  async convertToSubscription(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    const quotation = await this.db.quotation.findFirst({
      where: { id, workspaceId },
      include: { items: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found.');
    if (quotation.status !== 'confirmed') {
      throw new ConflictException('Only confirmed quotations can be converted.');
    }
    const item = quotation.items.find((entry) => entry.planId);
    if (!item?.planId) {
      throw new BadRequestException(
        'The quotation must contain a subscription plan to create a subscription.',
      );
    }
    const plan = await this.db.plan.findFirst({
      where: { id: item.planId, workspaceId, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('Quotation plan was not found.');
    const startsOn = new Date();
    const nextBillingOn = this.addInterval(
      startsOn,
      plan.intervalUnit,
      plan.intervalCount,
    );
    const subscription = await this.db.subscription.create({
      data: {
        workspaceId,
        subscriptionNumber: `SUB-${new Date().getFullYear()}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`,
        customerId: quotation.customerId,
        planId: plan.id,
        quotationId: quotation.id,
        startsOn,
        nextBillingOn,
        intervalUnit: plan.intervalUnit,
        intervalCount: plan.intervalCount,
        amount: item.lineTotal,
        currency: quotation.currency,
        status: 'active',
      },
      include: { customer: true, plan: true },
    });
    return { data: subscription };
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
  ): Promise<Prisma.QuotationItemUncheckedCreateWithoutQuotationInput[]> {
    let rows = input.items;
    if (!Array.isArray(rows) && typeof input.product === 'string') {
      const productName = input.product.split('·')[0].trim();
      const planName = input.product.split('·').slice(1).join('·').trim();
      const plan = planName
        ? await this.db.plan.findFirst({
            where: { workspaceId, name: planName, deletedAt: null },
          })
        : null;
      const product = await this.db.product.findFirst({
        where: { workspaceId, name: productName, deletedAt: null },
      });
      if (!product && !plan) throw new NotFoundException('Selected product or plan was not found.');
      rows = [{
        ...(plan ? { planId: plan.id } : { productId: product?.id }),
        description: input.product,
        quantity: input.quantity ?? 1,
        unitPrice: input.unitPrice ?? plan?.price.toString() ?? product?.salesPrice.toString(),
        taxRate: input.tax ?? 0,
      }];
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('At least one quotation item is required.');
    }
    const taxSettings = await this.db.workspaceTaxSettings.findUnique({
      where: { workspaceId },
      select: { taxRate: true },
    });
    return Promise.all(
      rows.map(async (raw) => {
        if (!raw || typeof raw !== 'object') {
          throw new BadRequestException('Quotation items must be objects.');
        }
        const row = raw as QuoteItemInput;
        if ((row.productId ? 1 : 0) + (row.planId ? 1 : 0) !== 1) {
          throw new BadRequestException('Each item must reference one product or plan.');
        }
        const source = row.planId
          ? await this.db.plan.findFirst({
              where: { id: row.planId, workspaceId, deletedAt: null },
            })
          : await this.db.product.findFirst({
              where: { id: row.productId, workspaceId, deletedAt: null },
            });
        if (!source) throw new NotFoundException('Quotation item reference was not found.');
        const unitPrice = new Prisma.Decimal(row.unitPrice);
        const quantity = Number(row.quantity);
        const taxRate = new Prisma.Decimal(
          String(row.taxRate ?? input.tax ?? taxSettings?.taxRate ?? 0),
        );
        if (!Number.isInteger(quantity) || quantity <= 0 || unitPrice.isNegative() || taxRate.isNegative() || taxRate.gt(100)) {
          throw new BadRequestException('Quotation item quantity, price, or tax is invalid.');
        }
        const descriptionSnapshot = String(
          row.description ?? ('name' in source ? source.name : 'Item'),
        );
        const lineSubtotal = unitPrice.mul(quantity).toDecimalPlaces(2);
        const taxAmount = lineSubtotal.mul(taxRate).div(100).toDecimalPlaces(2);
        return {
          workspaceId,
          ...(row.productId ? { productId: row.productId } : {}),
          ...(row.planId ? { planId: row.planId } : {}),
          descriptionSnapshot,
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

  private calculate(items: Prisma.QuotationItemUncheckedCreateWithoutQuotationInput[]) {
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

  private validateDateOrder(from: Date, to: Date): void {
    if (to < from) throw new BadRequestException('validUntil cannot be earlier than createdOn.');
  }

  private normalizeStatus(value: unknown): string {
    const status = String(value).toLowerCase();
    if (!['draft', 'quotation', 'confirmed'].includes(status)) {
      throw new BadRequestException('Quotation status is invalid.');
    }
    return status;
  }

  private addInterval(date: Date, unit: string, count: number): Date {
    const result = new Date(date);
    if (unit === 'day') result.setDate(result.getDate() + count);
    else if (unit === 'week') result.setDate(result.getDate() + 7 * count);
    else if (unit === 'month') result.setMonth(result.getMonth() + count);
    else result.setFullYear(result.getFullYear() + count);
    return result;
  }
}
