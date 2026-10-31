import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedContext } from '../auth/current-user.decorator';
import { ListQueryDto } from '../validation/list-query.dto';
import { PrismaService } from '../../database/prisma.service';

export interface CrudModelConfig {
  delegate: string;
  fields: readonly string[];
  searchFields: readonly string[];
  requiredFields?: readonly string[];
  foreignKeys?: readonly { field: string; delegate: string }[];
  filterFields?: readonly string[];
  include?: Record<string, unknown>;
  referencePrefix?: string;
  referenceField?: string;
  softDelete?: boolean;
}

interface Delegate {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  count(args: Record<string, unknown>): Promise<number>;
  findFirst(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class TenantCrudService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly config: CrudModelConfig,
  ) {}

  async list(context: AuthenticatedContext, query: ListQueryDto) {
    const workspaceId = this.requireWorkspace(context);
    const page = query.page || 1;
    const pageSize = query.pageSize || 25;
    const where: Record<string, unknown> = {
      workspaceId,
      ...(this.config.softDelete ? { deletedAt: null } : {}),
    };
    if (query.status && this.config.fields.includes('status')) {
      where.status = query.status.toLowerCase();
    }
    if (query.type && this.config.fields.includes('type')) {
      where.type = query.type.toLowerCase().replaceAll(' ', '_');
    }
    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt.gte = new Date(query.from);
      if (query.to) createdAt.lte = new Date(query.to);
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        throw new BadRequestException('The from date must be before the to date.');
      }
      where.createdAt = createdAt;
    }
    for (const field of this.config.filterFields ?? []) {
      const value = query[field as keyof ListQueryDto];
      if (typeof value === 'string' && value) where[field] = value;
    }
    const searchTerm = query.q?.trim();
    if (searchTerm) {
      where.OR = this.config.searchFields.map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));
    }
    const sortBy = ['createdAt', 'updatedAt', ...this.config.fields].includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';
    const delegate = this.getDelegate();
    const [items, total] = await Promise.all([
      delegate.findMany({
        where,
        include: this.config.include,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: query.sortOrder },
      }),
      delegate.count({ where }),
    ]);
    return {
      data: items,
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async get(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    const record = await this.getDelegate().findFirst({
      where: {
        id,
        workspaceId,
        ...(this.config.softDelete ? { deletedAt: null } : {}),
      },
      include: this.config.include,
    });
    if (!record) throw new NotFoundException('Record not found.');
    return { data: record };
  }

  async create(
    context: AuthenticatedContext,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    const data = this.pickAllowed(input);
    this.validateRequired(data);
    await this.validateForeignKeys(workspaceId, data);
    data.workspaceId = workspaceId;
    if (this.config.referencePrefix) {
      const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
      const year = new Date().getFullYear();
      const field = this.config.referenceField;
      if (!field) throw new Error('A reference field is required for this model.');
      data[field] = `${this.config.referencePrefix}-${year}-${suffix}`;
    }
    const record = await this.getDelegate().create({
      data,
      include: this.config.include,
    });
    return { data: record };
  }

  async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const workspaceId = this.requireWorkspace(context);
    await this.assertExists(workspaceId, id);
    const data = this.pickAllowed(input);
    delete data.workspaceId;
    await this.validateForeignKeys(workspaceId, data);
    const record = await this.getDelegate().update({
      where: { id },
      data,
      include: this.config.include,
    });
    return { data: record };
  }

  async remove(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    await this.assertExists(workspaceId, id);
    if (this.config.softDelete) {
      const record = await this.getDelegate().update({
        where: { id },
        data: { deletedAt: new Date(), status: 'archived' },
      });
      return { data: record };
    }
    await this.getDelegate().delete({ where: { id } });
    return { data: { success: true } };
  }

  protected requireWorkspace(context: AuthenticatedContext): string {
    if (!context.workspaceId) {
      throw new BadRequestException('Select a workspace using X-Workspace-Id.');
    }
    return context.workspaceId;
  }

  protected async assertExists(workspaceId: string, id: string): Promise<void> {
    const record = await this.getDelegate().findFirst({
      where: {
        id,
        workspaceId,
        ...(this.config.softDelete ? { deletedAt: null } : {}),
      },
    });
    if (!record) throw new NotFoundException('Record not found.');
  }

  protected pickAllowed(input: Record<string, unknown>): Record<string, unknown> {
    const unknownFields = Object.keys(input).filter(
      (field) =>
        !this.config.fields.includes(field) &&
        !['workspaceId', 'id', 'createdAt', 'updatedAt', 'deletedAt'].includes(field),
    );
    if (unknownFields.length) {
      throw new BadRequestException(
        `Unsupported fields: ${unknownFields.join(', ')}.`,
      );
    }
    const picked = Object.fromEntries(
      Object.entries(input).filter(([field, value]) => {
        return (
          this.config.fields.includes(field) &&
          field !== this.config.referenceField &&
          value !== undefined
        );
      }),
    );
    for (const [field, value] of Object.entries(picked)) {
      if (
        typeof value === 'string' &&
        [
          'availableFrom',
          'availableUntil',
          'startsOn',
          'expiresOn',
          'nextBillingOn',
          'validUntil',
          'issueDate',
          'dueDate',
          'endsOn',
          'createdOn',
        ].includes(field)
      ) {
        picked[field] = new Date(value);
      }
    }
    return picked;
  }

  protected validateRequired(data: Record<string, unknown>): void {
    const missing = (this.config.requiredFields ?? []).filter(
      (field) => data[field] === undefined || data[field] === null || data[field] === '',
    );
    if (missing.length) {
      throw new BadRequestException(
        `Required fields are missing: ${missing.join(', ')}.`,
      );
    }
  }

  protected async validateForeignKeys(
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    for (const relation of this.config.foreignKeys ?? []) {
      const value = data[relation.field];
      if (typeof value !== 'string') continue;
      const related = this.delegateByName(relation.delegate);
      const exists = await related.findFirst({
        where: { id: value, workspaceId },
      });
      if (!exists) {
        throw new BadRequestException(
          `${relation.field} must refer to a record in the selected workspace.`,
        );
      }
    }
  }

  private delegateByName(name: string): Delegate {
    const delegate = (this.prisma as unknown as Record<string, unknown>)[name];
    if (!delegate || typeof delegate !== 'object') {
      throw new Error(`Unknown Prisma delegate: ${name}`);
    }
    return delegate as Delegate;
  }

  private getDelegate(): Delegate {
    const delegate = (
      this.prisma as unknown as Record<string, unknown>
    )[this.config.delegate];
    if (!delegate || typeof delegate !== 'object') {
      throw new Error(`Unknown Prisma delegate: ${this.config.delegate}`);
    }
    return delegate as Delegate;
  }
}
