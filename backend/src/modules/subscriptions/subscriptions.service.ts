import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class SubscriptionsService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'subscription',
      fields: [
        'subscriptionNumber', 'customerId', 'planId', 'quotationId', 'startsOn',
        'expiresOn', 'nextBillingOn', 'intervalUnit', 'intervalCount',
        'amount', 'currency', 'status',
      ],
      searchFields: ['subscriptionNumber', 'status'],
      filterFields: ['customerId', 'planId'],
      include: { customer: true, plan: { include: { product: true } } },
      requiredFields: ['customerId', 'planId', 'startsOn'],
      foreignKeys: [
        { field: 'customerId', delegate: 'customer' },
        { field: 'planId', delegate: 'plan' },
        { field: 'quotationId', delegate: 'quotation' },
      ],
      referencePrefix: 'SUB',
      referenceField: 'subscriptionNumber',
    });
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    return super.create(context, await this.adapt(context, input));
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    return super.update(context, id, await this.adapt(context, input));
  }

  async transition(
    context: AuthenticatedContext,
    id: string,
    action: 'pause' | 'resume' | 'cancel',
    effectiveOn?: string,
    reason?: string,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const subscription = await this.db.subscription.findFirst({
      where: { id, workspaceId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    const now = new Date();
    const data =
      action === 'pause'
        ? subscription.status === 'active' && subscription.plan.allowPause
          ? { status: 'paused', pausedAt: now }
          : null
        : action === 'resume'
          ? subscription.status === 'paused'
            ? { status: 'active', pausedAt: null }
            : null
          : ['active', 'paused', 'draft'].includes(subscription.status)
            ? {
                status: 'cancelled',
                cancelledAt: effectiveOn ? new Date(effectiveOn) : now,
              }
            : null;
    if (!data) {
      throw new ConflictException(
        `Subscription cannot be ${action === 'cancel' ? 'cancelled' : `${action}d`} from its current state.`,
      );
    }
    const updated = await this.db.subscription.update({
      where: { id },
      data,
      include: { customer: true, plan: { include: { product: true } } },
    });
    if (reason) {
      await this.db.auditLog.create({
        data: {
          workspaceId,
          actorUserId: context.userId,
          action: `subscription.${action}`,
          entityType: 'subscription',
          entityId: id,
          metadata: { reason },
        },
      });
    }
    return { data: updated };
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
    if (!data.planId && typeof data.plan === 'string') {
      const plan = await this.db.plan.findFirst({
        where: { workspaceId, name: data.plan, deletedAt: null },
        select: { id: true, price: true, intervalUnit: true, intervalCount: true },
      });
      if (!plan) throw new NotFoundException('Selected plan was not found.');
      data.planId = plan.id;
      data.amount ??= plan.price.toString();
      data.intervalUnit ??= plan.intervalUnit;
      data.intervalCount ??= plan.intervalCount;
    }
    delete data.name;
    delete data.customer;
    delete data.plan;
    data.startsOn ??= data.startDate;
    data.expiresOn ??= data.expiryDate;
    data.nextBillingOn ??= data.nextBilling;
    data.amount ??= data.total;
    if (typeof data.interval === 'string' && !data.intervalUnit) {
      const interval = data.interval.toLowerCase();
      const intervals: Record<string, string> = {
        daily: 'day',
        day: 'day',
        weekly: 'week',
        week: 'week',
        monthly: 'month',
        month: 'month',
        yearly: 'year',
        year: 'year',
      };
      data.intervalUnit = intervals[interval];
    }
    delete data.startDate;
    delete data.expiryDate;
    delete data.nextBilling;
    delete data.total;
    delete data.interval;
    if (typeof data.status === 'string') data.status = data.status.toLowerCase();
    if (
      typeof data.status === 'string' &&
      !['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired', 'cancelled'].includes(data.status)
    ) {
      throw new BadRequestException('Subscription status is invalid.');
    }
    if (!data.subscriptionNumber) {
      data.subscriptionNumber = `SUB-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    }
    return data;
  }
}
