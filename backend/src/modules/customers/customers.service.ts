import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { TenantCrudService } from '../../common/services/tenant-crud.service';

@Injectable()
export class CustomersService extends TenantCrudService {
  constructor(prisma: PrismaService) {
    super(prisma, {
      delegate: 'customer',
      fields: [
        'customerNumber', 'name', 'email', 'phone', 'companyName', 'address',
        'location', 'status',
      ],
      searchFields: ['customerNumber', 'name', 'email', 'companyName', 'phone'],
      requiredFields: ['name', 'email'],
      referencePrefix: 'CUS',
      referenceField: 'customerNumber',
      softDelete: true,
    });
  }

  override async create(context: AuthenticatedContext, input: Record<string, unknown>) {
    const data = { ...input };
    if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase();
    if (typeof data.status === 'string') {
      const status = data.status.toLowerCase();
      this.validateStatus(status);
      data.status = status;
    }
    if (typeof data.name === 'string' && !data.name.trim()) {
      throw new BadRequestException('Customer name cannot be empty.');
    }
    if (typeof data.name === 'string') data.name = data.name.trim();
    return super.create(context, data);
  }

  override async update(
    context: AuthenticatedContext,
    id: string,
    input: Record<string, unknown>,
  ) {
    const data = { ...input };
    if (typeof data.name === 'string' && !data.name.trim()) {
      throw new BadRequestException('Customer name cannot be empty.');
    }
    if (typeof data.name === 'string') data.name = data.name.trim();
    if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase();
    if (typeof data.status === 'string') {
      const status = data.status.toLowerCase();
      this.validateStatus(status);
      data.status = status;
    }
    return super.update(context, id, data);
  }

  private validateStatus(status: string): void {
    if (!['active', 'inactive', 'archived'].includes(status)) {
      throw new BadRequestException('Customer status is invalid.');
    }
  }
}
