import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  AuthenticatedContext,
} from '../../common/auth/current-user.decorator';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class ProductsService extends TenantCrudService {
  constructor(private readonly db: PrismaService) {
    super(db, {
      delegate: 'product',
      fields: [
        'productNumber', 'name', 'type', 'description', 'salesPrice',
        'costPrice', 'currency', 'status',
      ],
      searchFields: ['productNumber', 'name', 'type', 'description'],
      filterFields: ['type'],
      include: { variants: true },
      requiredFields: ['name', 'type', 'salesPrice', 'costPrice'],
      referencePrefix: 'PRD',
      referenceField: 'productNumber',
      softDelete: true,
    });
  }

  override async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const variants = this.normalizeVariants(input.variants, input.variantPrice);
    const data = { ...input };
    delete data.variants;
    delete data.variantPrice;
    this.normalizeEnums(data);
    const workspaceId = this.requireWorkspace(context);
    const productData = this.pickAllowed(data);
    this.validateRequired(productData);
    const productNumber = `PRD-${new Date().getFullYear()}-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 10)
      .toUpperCase()}`;
    const createData: Prisma.ProductUncheckedCreateInput = {
      workspaceId,
      productNumber,
      name: String(productData.name),
      type: String(productData.type),
      salesPrice: new Prisma.Decimal(String(productData.salesPrice)),
      costPrice: new Prisma.Decimal(String(productData.costPrice)),
      ...(typeof productData.description === 'string'
        ? { description: productData.description }
        : {}),
      ...(typeof productData.currency === 'string'
        ? { currency: productData.currency.toUpperCase() }
        : {}),
      ...(typeof productData.status === 'string'
        ? { status: productData.status }
        : {}),
    };
    return this.db.$transaction(async (transaction) => {
      const product = await transaction.product.create({ data: createData });
      if (variants.length) {
        await transaction.productVariant.createMany({
          data: variants.map((variant) => ({
            ...variant,
            productId: product.id,
          })),
        });
      }
      return {
        data: await transaction.product.findUniqueOrThrow({
          where: { id: product.id },
          include: { variants: true },
        }),
      };
    });
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const hasVariants = Object.hasOwn(input, 'variants');
    const variants = this.normalizeVariants(input.variants, input.variantPrice);
    const data = { ...input };
    delete data.variants;
    delete data.variantPrice;
    this.normalizeEnums(data);
    const workspaceId = this.requireWorkspace(context);
    const productData = this.pickAllowed(data);
    delete productData.workspaceId;
    await this.assertExists(workspaceId, id);
    await this.validateForeignKeys(workspaceId, productData);
    return this.db.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id },
        data: productData,
      });
      if (hasVariants) {
        await transaction.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length) {
          await transaction.productVariant.createMany({
            data: variants.map((variant) => ({ ...variant, productId: id })),
          });
        }
      }
      return {
        data: await transaction.product.findUniqueOrThrow({
          where: { id },
          include: { variants: true },
        }),
      };
    });
  }

  private normalizeVariants(
    value: unknown,
    additionalPrice: unknown,
  ): Array<{ name: string; additionalPrice: number }> {
    if (value === undefined || value === null || value === '') return [];
    const variants = typeof value === 'string'
      ? value.split(',').map((name) => ({ name: name.trim() }))
      : Array.isArray(value)
        ? value
        : null;
    if (!variants) {
      throw new BadRequestException('Variants must be a comma-separated string or an array.');
    }
    const fallbackPrice = Number(additionalPrice ?? 0);
    return variants.map((entry) => {
      if (!entry || typeof entry !== 'object' || !('name' in entry)) {
        throw new BadRequestException('Each variant must include a name.');
      }
      const variant = entry as Record<string, unknown>;
      const name = String(variant.name).trim();
      const price = Number(variant.additionalPrice ?? fallbackPrice);
      if (!name || !Number.isFinite(price) || price < 0) {
        throw new BadRequestException('Variant names and prices must be valid.');
      }
      return { name, additionalPrice: price };
    }).filter((variant) => variant.name.length > 0);
  }

  private normalizeEnums(data: Record<string, unknown>): void {
    if (typeof data.status === 'string') {
      const status = data.status.toLowerCase();
      if (!['active', 'inactive', 'archived'].includes(status)) {
        throw new BadRequestException('Product status is invalid.');
      }
      data.status = status;
    }
    if (typeof data.type === 'string') {
      const type = data.type.toLowerCase().replaceAll(' ', '_');
      if (!['digital_service', 'service', 'physical_product'].includes(type)) {
        throw new BadRequestException('Product type is invalid.');
      }
      data.type = type;
    }
    for (const field of ['salesPrice', 'costPrice']) {
      if (
        data[field] !== undefined &&
        (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0)
      ) {
        throw new BadRequestException(`${field} must be a non-negative amount.`);
      }
    }
  }
}
