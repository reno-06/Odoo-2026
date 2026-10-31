import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class DiscountsService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'discount',
      fields: [
        'discountNumber', 'name', 'code', 'type', 'value', 'minimumPurchase',
        'minimumQuantity', 'startsOn', 'endsOn', 'usageLimit', 'appliesTo',
        'status',
      ],
      searchFields: ['discountNumber', 'name', 'code'],
      include: { products: true, plans: true, _count: { select: { redemptions: true } } },
      requiredFields: ['name', 'type', 'value', 'appliesTo'],
      referencePrefix: 'DSC',
      referenceField: 'discountNumber',
    });
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const data = await this.normalize(context, input);
    const productIds = this.stringArray(data.productIds);
    const planIds = this.stringArray(data.planIds);
    delete data.productIds;
    delete data.planIds;
    this.validateSelectedTargets(data.appliesTo, productIds, planIds);
    await this.assertTargetsBelongToWorkspace(context, productIds, planIds);
    const created = await super.create(context, data);
    const id = String(created.data.id);
    await this.setTargets(context, id, productIds, planIds);
    return this.get(context, id);
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const current = await this.db.discount.findFirst({
      where: { id, workspaceId },
      include: { products: { select: { id: true } }, plans: { select: { id: true } } },
    });
    if (!current) throw new NotFoundException('Discount not found.');
    const data = await this.normalize(context, { ...current, ...input });
    const hasProducts = Object.hasOwn(data, 'productIds');
    const hasPlans = Object.hasOwn(data, 'planIds');
    const productIds = this.stringArray(data.productIds);
    const planIds = this.stringArray(data.planIds);
    delete data.productIds;
    delete data.planIds;
    this.validateSelectedTargets(
      data.appliesTo,
      hasProducts ? productIds : current.products.map((product) => product.id),
      hasPlans ? planIds : current.plans.map((plan) => plan.id),
    );
    const updateData: Record<string, unknown> = {};
    for (const field of [
      'name',
      'code',
      'type',
      'value',
      'minimumPurchase',
      'minimumQuantity',
      'startsOn',
      'endsOn',
      'usageLimit',
      'appliesTo',
      'status',
    ]) {
      if (Object.hasOwn(input, field)) updateData[field] = data[field];
    }
    if (Object.hasOwn(input, 'discountType')) updateData.type = data.type;
    if (Object.hasOwn(input, 'starts')) updateData.startsOn = data.startsOn;
    if (Object.hasOwn(input, 'ends')) updateData.endsOn = data.endsOn;
    if (hasProducts || hasPlans) {
      await this.assertTargetsBelongToWorkspace(
        context,
        hasProducts ? productIds : [],
        hasPlans ? planIds : [],
      );
    }
    await super.update(context, id, updateData);
    if (hasProducts || hasPlans) {
      const [products, plans] = await Promise.all([
        this.db.product.findMany({
          where: { workspaceId, id: { in: productIds }, deletedAt: null },
          select: { id: true },
        }),
        this.db.plan.findMany({
          where: { workspaceId, id: { in: planIds }, deletedAt: null },
          select: { id: true },
        }),
      ]);
      if (hasProducts && products.length !== productIds.length) {
        throw new BadRequestException('Discount products must belong to this workspace.');
      }
      if (hasPlans && plans.length !== planIds.length) {
        throw new BadRequestException('Discount plans must belong to this workspace.');
      }
      await this.db.discount.update({
        where: { id },
        data: {
          ...(hasProducts ? { products: { set: productIds.map((targetId) => ({ id: targetId })) } } : {}),
          ...(hasPlans ? { plans: { set: planIds.map((targetId) => ({ id: targetId })) } } : {}),
        },
      });
    }
    return this.get(context, id);
  }

  async validateDiscount(
    context: AuthenticatedContext,
    id: string,
    customerId: string,
    items: Array<{
      productId?: string;
      planId?: string;
      quantity: number;
      unitPrice: number;
    }>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const discount = await this.db.discount.findFirst({
      where: { id, workspaceId },
      include: {
        products: { select: { id: true } },
        plans: { select: { id: true } },
        _count: { select: { redemptions: true } },
      },
    });
    if (!discount) throw new NotFoundException('Discount not found.');
    const customer = await this.db.customer.findFirst({
      where: { id: customerId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Customer is not in this workspace.');
    const now = new Date();
    if (
      discount.status !== 'active' ||
      (discount.startsOn && discount.startsOn > now) ||
      (discount.endsOn && discount.endsOn < now) ||
      (discount.usageLimit !== null && discount._count.redemptions >= discount.usageLimit)
    ) {
      return { data: { valid: false, reason: 'Discount is inactive, expired, or used up.' } };
    }

    let subtotal = new Prisma.Decimal(0);
    let quantity = 0;
    for (const item of items) {
      if ((item.productId ? 1 : 0) + (item.planId ? 1 : 0) !== 1) {
        throw new BadRequestException('Each cart item must reference one product or plan.');
      }
      const valid = item.productId
        ? discount.appliesTo === 'all_products' ||
          discount.products.some((product) => product.id === item.productId)
        : discount.appliesTo === 'all_products' ||
          discount.appliesTo === 'subscription_wide' ||
          discount.plans.some((plan) => plan.id === item.planId);
      if (!valid) continue;
      const targetExists = item.productId
        ? await this.db.product.findFirst({
            where: { id: item.productId, workspaceId, deletedAt: null },
            select: { id: true },
          })
        : await this.db.plan.findFirst({
            where: { id: item.planId, workspaceId, deletedAt: null },
            select: { id: true },
          });
      if (!targetExists) {
        throw new BadRequestException('Cart item is not in this workspace.');
      }
      subtotal = subtotal.add(
        new Prisma.Decimal(item.unitPrice).mul(item.quantity),
      );
      quantity += item.quantity;
    }
    if (
      subtotal.isZero() ||
      (discount.minimumPurchase && subtotal.lt(discount.minimumPurchase)) ||
      (discount.minimumQuantity && quantity < discount.minimumQuantity)
    ) {
      return { data: { valid: false, reason: 'Cart does not meet discount requirements.' } };
    }
    const amount =
      discount.type === 'percentage'
        ? subtotal.mul(discount.value).div(100)
        : Prisma.Decimal.min(subtotal, discount.value);
    return {
      data: {
        valid: true,
        discountId: discount.id,
        subtotal: subtotal.toFixed(2),
        discountAmount: amount.toDecimalPlaces(2).toFixed(2),
        total: subtotal.sub(amount).toDecimalPlaces(2).toFixed(2),
      },
    };
  }

  private async normalize(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const data = { ...input };
    if (typeof data.discountType === 'string') {
      data.type = data.discountType.toLowerCase().includes('percentage')
        ? 'percentage'
        : 'fixed_amount';
    } else if (typeof data.type === 'string') {
      const type = data.type.toLowerCase();
      if (type.includes('percentage')) data.type = 'percentage';
      else if (['fixed', 'fixed_amount', 'fixed amount'].includes(type)) {
        data.type = 'fixed_amount';
      }
    }
    delete data.discountType;

    if (typeof data.appliesTo === 'string') {
      const text = data.appliesTo.toLowerCase();
      if (text === 'all products') data.appliesTo = 'all_products';
      else if (text === 'subscription-wide') data.appliesTo = 'subscription_wide';
      else if (text === 'selected products') data.appliesTo = 'selected_products';
      else if (text === 'selected plans') data.appliesTo = 'selected_plans';
      else if (text.includes('annual') || text.includes('monthly') || text.includes('growth')) {
        const plan = await this.db.plan.findFirst({
          where: { workspaceId: this.requireWorkspace(context), name: data.appliesTo },
          select: { id: true },
        });
        if (!plan) throw new NotFoundException('Selected plan was not found.');
        data.planIds = [plan.id];
        data.appliesTo = 'selected_plans';
      } else {
        const product = await this.db.product.findFirst({
          where: { workspaceId: this.requireWorkspace(context), name: data.appliesTo },
          select: { id: true },
        });
        if (!product) throw new NotFoundException('Selected product was not found.');
        data.productIds = [product.id];
        data.appliesTo = 'selected_products';
      }
    }
    if (typeof data.starts === 'string') data.startsOn = data.starts;
    if (typeof data.ends === 'string') data.endsOn = data.ends;
    delete data.starts;
    delete data.ends;
    if (typeof data.status === 'string') {
      const status = data.status.toLowerCase();
      if (!['active', 'inactive', 'expired'].includes(status)) {
        throw new BadRequestException('Discount status is invalid.');
      }
      data.status = status;
    }
    const type = String(data.type ?? '');
    const value = Number(data.value ?? 0);
    if (!['percentage', 'fixed_amount'].includes(type)) {
      throw new BadRequestException('Discount type is invalid.');
    }
    if (!Number.isFinite(value) || value <= 0 || (type === 'percentage' && value > 100)) {
      throw new BadRequestException('Discount value is invalid.');
    }
    if (
      data.startsOn !== undefined &&
      data.endsOn !== undefined &&
      new Date(String(data.endsOn)) < new Date(String(data.startsOn))
    ) {
      throw new BadRequestException('Discount end date cannot be before its start date.');
    }
    if (
      typeof data.appliesTo !== 'string' ||
      !['all_products', 'selected_products', 'selected_plans', 'subscription_wide'].includes(data.appliesTo)
    ) {
      throw new BadRequestException('Discount applicability is invalid.');
    }
    return data;
  }

  private stringArray(value: unknown): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      throw new BadRequestException('Discount targets must be an array of IDs.');
    }
    return value;
  }

  private validateSelectedTargets(
    appliesTo: unknown,
    productIds: string[],
    planIds: string[],
  ): void {
    if (appliesTo === 'selected_products' && productIds.length === 0) {
      throw new BadRequestException('Select at least one product for this discount.');
    }
    if (appliesTo === 'selected_plans' && planIds.length === 0) {
      throw new BadRequestException('Select at least one plan for this discount.');
    }
  }

  private async setTargets(
    context: AuthenticatedContext,
    discountId: string,
    productIds: string[],
    planIds: string[],
  ): Promise<void> {
    await this.assertTargetsBelongToWorkspace(context, productIds, planIds);
    if (productIds.length || planIds.length) {
      await this.db.discount.update({
        where: { id: discountId },
        data: {
          products: { connect: productIds.map((id) => ({ id })) },
          plans: { connect: planIds.map((id) => ({ id })) },
        },
      });
    }
  }

  private async assertTargetsBelongToWorkspace(
    context: AuthenticatedContext,
    productIds: string[],
    planIds: string[],
  ): Promise<void> {
    const workspaceId = this.requireWorkspace(context);
    const [products, plans] = await Promise.all([
      this.db.product.findMany({
        where: { workspaceId, id: { in: productIds }, deletedAt: null },
        select: { id: true },
      }),
      this.db.plan.findMany({
        where: { workspaceId, id: { in: planIds }, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (products.length !== productIds.length || plans.length !== planIds.length) {
      throw new BadRequestException('Discount targets must belong to this workspace.');
    }
  }
}
