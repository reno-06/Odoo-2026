import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class PlansService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'plan',
      fields: [
        'planNumber', 'productId', 'name', 'intervalUnit', 'intervalCount',
        'price', 'currency', 'minimumQuantity', 'availableFrom',
        'availableUntil', 'autoClose', 'allowEarlyClosure', 'allowPause',
        'allowRenewal', 'status',
      ],
      searchFields: ['planNumber', 'name'],
      requiredFields: ['productId', 'name', 'intervalUnit', 'price', 'minimumQuantity'],
      foreignKeys: [{ field: 'productId', delegate: 'product' }],
      filterFields: ['productId'],
      include: { product: true },
      referencePrefix: 'PLN',
      referenceField: 'planNumber',
      softDelete: true,
    });
  }

  override async create(context: AuthenticatedContext, input: Record<string, unknown>) {
    return super.create(context, await this.adaptInput(context, input));
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    return super.update(context, id, await this.adaptInput(context, input));
  }

  async setStatus(
    context: AuthenticatedContext,
    id: string,
    status: 'active' | 'inactive',
  ) {
    const workspaceId = this.requireWorkspace(context);
    const exists = await this.db.plan.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Plan not found.');
    const plan = await this.db.plan.update({
      where: { id },
      data: { status },
      include: { product: true },
    });
    return { data: plan };
  }

  private async adaptInput(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const data = { ...input };
    const workspaceId = this.requireWorkspace(context);
    if (!data.productId && typeof data.product === 'string') {
      const product = await this.db.product.findFirst({
        where: { workspaceId, name: data.product, deletedAt: null },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Selected product was not found.');
      data.productId = product.id;
    }
    delete data.product;

    const interval = data.intervalUnit ?? data.interval;
    if (typeof interval === 'string') {
      const normalized = interval.toLowerCase().replace(/ly$/, '');
      const intervalMap: Record<string, string> = {
        daily: 'day',
        day: 'day',
        weekly: 'week',
        week: 'week',
        monthly: 'month',
        month: 'month',
        yearly: 'year',
        year: 'year',
      };
      data.intervalUnit = intervalMap[normalized] ?? intervalMap[interval.toLowerCase()];
      if (!data.intervalUnit) throw new NotFoundException('Billing interval is invalid.');
    }
    delete data.interval;
    if (typeof data.renewals === 'string') {
      data.allowRenewal = data.renewals.toLowerCase() !== 'not allowed';
      delete data.renewals;
    }
    if (typeof data.status === 'string') {
      const status = data.status.toLowerCase();
      if (!['active', 'inactive', 'archived'].includes(status)) {
        throw new BadRequestException('Plan status is invalid.');
      }
      data.status = status;
    }
    return data;
  }
}
