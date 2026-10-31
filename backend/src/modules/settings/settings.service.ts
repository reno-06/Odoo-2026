import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompany(context: AuthenticatedContext) {
    const workspaceId = this.requireWorkspace(context);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        companyName: true,
        billingEmail: true,
        phone: true,
        address: true,
        taxId: true,
        defaultCurrency: true,
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    return { data: workspace };
  }

  async updateCompany(
    context: AuthenticatedContext,
    input: {
      companyName?: string;
      billingEmail?: string;
      phone?: string;
      address?: string;
    },
  ) {
    const workspaceId = this.requireWorkspace(context);
    if (input.companyName !== undefined && !input.companyName.trim()) {
      throw new BadRequestException('Company name cannot be empty.');
    }
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.companyName !== undefined
          ? { companyName: input.companyName.trim(), name: input.companyName.trim() }
          : {}),
        ...(input.billingEmail !== undefined
          ? { billingEmail: input.billingEmail.trim().toLowerCase() }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
    });
    return { data: workspace };
  }

  async getTax(context: AuthenticatedContext) {
    const workspaceId = this.requireWorkspace(context);
    const tax = await this.prisma.workspaceTaxSettings.findUnique({
      where: { workspaceId },
    });
    return {
      data: tax ?? { workspaceId, taxName: 'Sales tax', taxRate: '0.0000', taxId: null },
    };
  }

  async updateTax(
    context: AuthenticatedContext,
    input: { taxName?: string; taxRate?: number; taxId?: string },
  ) {
    const workspaceId = this.requireWorkspace(context);
    if (input.taxName !== undefined && !input.taxName.trim()) {
      throw new BadRequestException('Tax name cannot be empty.');
    }
    if (input.taxRate !== undefined && (input.taxRate < 0 || input.taxRate > 100)) {
      throw new BadRequestException('Tax rate must be between 0 and 100.');
    }
    const current = await this.prisma.workspaceTaxSettings.findUnique({
      where: { workspaceId },
    });
    const tax = await this.prisma.workspaceTaxSettings.upsert({
      where: { workspaceId },
      update: {
        ...(input.taxName !== undefined ? { taxName: input.taxName.trim() } : {}),
        ...(input.taxRate !== undefined ? { taxRate: new Prisma.Decimal(input.taxRate) } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId || null } : {}),
      },
      create: {
        workspaceId,
        taxName: input.taxName?.trim() || 'Sales tax',
        taxRate: new Prisma.Decimal(input.taxRate ?? 0),
        taxId: input.taxId || null,
      },
    });
    return { data: tax };
  }

  async getPreferences(context: AuthenticatedContext) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: context.userId },
    });
    return {
      data: preferences ?? {
        userId: context.userId,
        currency: 'USD',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        emailNotifications: true,
      },
    };
  }

  async updatePreferences(
    context: AuthenticatedContext,
    input: {
      currency?: string;
      timezone?: string;
      dateFormat?: string;
      emailNotifications?: boolean;
    },
  ) {
    const data: {
      currency?: string;
      timezone?: string;
      dateFormat?: string;
      emailNotifications?: boolean;
    } = {};
    if (input.currency !== undefined) data.currency = input.currency.toUpperCase();
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.dateFormat !== undefined) data.dateFormat = input.dateFormat;
    if (input.emailNotifications !== undefined) {
      data.emailNotifications = input.emailNotifications;
    }
    return {
      data: await this.prisma.userPreferences.upsert({
        where: { userId: context.userId },
        update: data,
        create: {
          userId: context.userId,
          currency: data.currency ?? 'USD',
          timezone: data.timezone ?? 'UTC',
          dateFormat: data.dateFormat ?? 'YYYY-MM-DD',
          emailNotifications: data.emailNotifications ?? true,
        },
      }),
    };
  }

  private requireWorkspace(context: AuthenticatedContext): string {
    if (!context.workspaceId) throw new BadRequestException('Select a workspace.');
    return context.workspaceId;
  }
}
