import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async getProfile(context: AuthenticatedContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: context.userId },
      select: { id: true, email: true, fullName: true, status: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return { data: user };
  }

  async updateProfile(
    context: AuthenticatedContext,
    input: { fullName?: string; email?: string },
  ) {
    if (input.fullName !== undefined && !input.fullName.trim()) {
      throw new BadRequestException('Full name cannot be empty.');
    }
    const user = await this.prisma.user.update({
      where: { id: context.userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      },
      select: { id: true, email: true, fullName: true, status: true },
    });
    return { data: user };
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
    const data = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    if (typeof input.currency === 'string') {
      data.currency = input.currency.toUpperCase();
    }
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId: context.userId },
      update: data,
      create: {
        userId: context.userId,
        currency: String(data.currency ?? 'USD'),
        timezone: String(data.timezone ?? 'UTC'),
        dateFormat: String(data.dateFormat ?? 'YYYY-MM-DD'),
        emailNotifications: Boolean(data.emailNotifications ?? true),
      },
    });
    return { data: preferences };
  }

  async changePassword(
    context: AuthenticatedContext,
    currentPassword: string,
    newPassword: string,
  ) {
    await this.auth.changePassword(context.userId, currentPassword, newPassword);
    return { data: { success: true } };
  }
}
