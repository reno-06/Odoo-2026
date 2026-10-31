import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class PaymentsService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'payment',
      fields: [
        'paymentNumber', 'customerId', 'invoiceId', 'amount', 'currency',
        'method', 'status', 'paidAt', 'externalReference', 'provider',
        'providerPaymentId', 'notes', 'createdById',
      ],
      searchFields: ['paymentNumber', 'method', 'externalReference'],
      filterFields: ['customerId', 'invoiceId'],
      include: { customer: true, invoice: true },
      requiredFields: ['customerId', 'amount', 'method'],
      foreignKeys: [
        { field: 'customerId', delegate: 'customer' },
        { field: 'invoiceId', delegate: 'invoice' },
      ],
      referencePrefix: 'PAY',
      referenceField: 'paymentNumber',
    });
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const data = await this.adapt(context, input);
    data.createdById = context.userId;
    const workspaceId = this.requireWorkspace(context);
    const createData = this.pickAllowed(data);
    this.validateRequired(createData);
    await this.validateForeignKeys(workspaceId, createData);
    const reference = `PAY-${new Date().getFullYear()}-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 10)
      .toUpperCase()}`;
    return this.db.$transaction(async (transaction) => {
      const invoiceId =
        typeof createData.invoiceId === 'string' ? createData.invoiceId : undefined;
      if (invoiceId) await this.lockInvoice(transaction, workspaceId, invoiceId);
      await this.validatePayment(
        transaction,
        workspaceId,
        createData,
      );
      const paymentData: Prisma.PaymentUncheckedCreateInput = {
        workspaceId,
        paymentNumber: reference,
        customerId: String(createData.customerId),
        createdById: context.userId,
        amount: new Prisma.Decimal(String(createData.amount)),
        currency: String(createData.currency ?? 'USD').toUpperCase(),
        method: String(createData.method),
        status: typeof createData.status === 'string' ? createData.status : 'pending',
        ...(typeof createData.invoiceId === 'string'
          ? { invoiceId: createData.invoiceId }
          : {}),
        ...(createData.paidAt instanceof Date
          ? { paidAt: createData.paidAt }
          : {}),
        ...(typeof createData.externalReference === 'string'
          ? { externalReference: createData.externalReference }
          : {}),
        ...(typeof createData.provider === 'string'
          ? { provider: createData.provider }
          : {}),
        ...(typeof createData.providerPaymentId === 'string'
          ? { providerPaymentId: createData.providerPaymentId }
          : {}),
        ...(typeof createData.notes === 'string' ? { notes: createData.notes } : {}),
      };
      const record = await transaction.payment.create({
        data: paymentData,
        include: { customer: true, invoice: true },
      });
      if (invoiceId && record.status === 'completed') {
        await this.refreshInvoiceStatus(transaction, workspaceId, invoiceId);
      }
      return { data: record };
    });
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const data = await this.adapt(context, input);
    delete data.createdById;
    const workspaceId = this.requireWorkspace(context);
    const updateData = this.pickAllowed(data);
    delete updateData.workspaceId;

    return this.db.$transaction(async (transaction) => {
      const current = await transaction.payment.findFirst({
        where: { id, workspaceId },
      });
      if (!current) throw new NotFoundException('Record not found.');
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM payments WHERE id = ${id}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`,
      );
      const merged = { ...current, ...updateData } as Record<string, unknown>;
      const invoiceIds = [
        current.invoiceId,
        typeof merged.invoiceId === 'string' ? merged.invoiceId : null,
      ]
        .filter((value): value is string => Boolean(value))
        .filter((value, index, list) => list.indexOf(value) === index)
        .sort();
      for (const invoiceId of invoiceIds) {
        await this.lockInvoice(transaction, workspaceId, invoiceId);
      }
      await this.validatePayment(transaction, workspaceId, merged, id);
      const record = await transaction.payment.update({
        where: { id },
        data: updateData,
        include: { customer: true, invoice: true },
      });
      for (const invoiceId of invoiceIds) {
        await this.refreshInvoiceStatus(transaction, workspaceId, invoiceId);
      }
      return { data: record };
    });
  }

  override async remove(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    return this.db.$transaction(async (transaction) => {
      const current = await transaction.payment.findFirst({
        where: { id, workspaceId },
      });
      if (!current) throw new NotFoundException('Record not found.');
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM payments WHERE id = ${id}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`,
      );
      if (current.invoiceId) {
        await this.lockInvoice(transaction, workspaceId, current.invoiceId);
      }
      await transaction.payment.delete({ where: { id } });
      if (current.invoiceId) {
        await this.refreshInvoiceStatus(
          transaction,
          workspaceId,
          current.invoiceId,
        );
      }
      return { data: { success: true } };
    });
  }

  private async adapt(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const data = { ...input };
    const workspaceId = this.requireWorkspace(context);
    if (!data.customerId && typeof (data.customer ?? data.name) === 'string') {
      const customer = await this.db.customer.findFirst({
        where: {
          workspaceId,
          name: String(data.customer ?? data.name),
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Selected customer was not found.');
      data.customerId = customer.id;
    }
    if (!data.invoiceId && typeof data.invoice === 'string' && data.invoice.trim()) {
      const invoice = await this.db.invoice.findFirst({
        where: { workspaceId, invoiceNumber: data.invoice },
        select: { id: true },
      });
      if (!invoice) throw new NotFoundException('Selected invoice was not found.');
      data.invoiceId = invoice.id;
    }
    if (data.paidAt === undefined) data.paidAt = data.date;
    delete data.name;
    delete data.customer;
    delete data.invoice;
    delete data.date;
    if (typeof data.status === 'string') data.status = data.status.toLowerCase();
    if (typeof data.method === 'string') {
      const normalized = data.method.toLowerCase();
      data.method =
        normalized === 'bank transfer' ? 'bank_transfer' : normalized;
      if (!['cash', 'bank_transfer', 'card', 'upi', 'other'].includes(String(data.method))) {
        throw new BadRequestException('Payment method is invalid.');
      }
    }
    if (
      typeof data.status === 'string' &&
      !['pending', 'completed', 'failed', 'refunded'].includes(data.status)
    ) {
      throw new BadRequestException('Payment status is invalid.');
    }
    if (typeof data.paidAt === 'string') data.paidAt = new Date(data.paidAt);
    return data;
  }

  private async validatePayment(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
    data: Record<string, unknown>,
    excludePaymentId?: string,
  ): Promise<void> {
    const amount = new Prisma.Decimal(String(data.amount ?? 0));
    if (!amount.gt(0)) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }
    if (!data.invoiceId) return;
    const invoice = await transaction.invoice.findFirst({
      where: {
        id: String(data.invoiceId),
        workspaceId,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (data.customerId !== invoice.customerId) {
      throw new BadRequestException('Payment customer must match the invoice customer.');
    }
    if (data.currency && data.currency !== invoice.currency) {
      throw new BadRequestException('Payment currency must match the invoice currency.');
    }
    data.currency = invoice.currency;
    if (
      invoice.status === 'draft' ||
      invoice.status === 'cancelled' ||
      (invoice.status === 'paid' && !excludePaymentId)
    ) {
      throw new BadRequestException('Payments cannot be recorded for this invoice.');
    }
    if (data.status === 'completed') {
      const paid = await transaction.payment.aggregate({
        where: {
          invoiceId: invoice.id,
          status: 'completed',
          ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
        },
        _sum: { amount: true },
      });
      const remaining = invoice.total.sub(paid._sum.amount ?? new Prisma.Decimal(0));
      if (amount.gt(remaining)) {
        throw new BadRequestException('Payment exceeds the remaining invoice balance.');
      }
    }
  }

  private async refreshInvoiceStatus(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await transaction.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: {
        payments: { where: { status: 'completed' }, select: { amount: true } },
      },
    });
    if (!invoice) return;
    const paid = invoice.payments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0),
    );
    if (invoice.status === 'cancelled' || invoice.status === 'draft') return;
    const status = paid.gte(invoice.total)
      ? 'paid'
      : invoice.dueDate < new Date()
        ? 'overdue'
        : 'confirmed';
    if (status !== invoice.status) {
      await transaction.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });
    }
  }

  private async lockInvoice(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
    invoiceId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`,
    );
    if (!rows.length) throw new NotFoundException('Invoice not found.');
  }
}
