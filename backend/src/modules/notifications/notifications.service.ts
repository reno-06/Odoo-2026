import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { NotificationsQueryDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: AuthenticatedContext, query: NotificationsQueryDto) {
    const workspaceId = this.requireWorkspace(context);
    const where = {
      workspaceId,
      userId: context.userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { workspaceId, userId: context.userId, readAt: null },
      }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        unreadCount,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async markRead(context: AuthenticatedContext, id: string) {
    const workspaceId = this.requireWorkspace(context);
    const updated = await this.prisma.notification.updateMany({
      where: { id, workspaceId, userId: context.userId },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundException('Notification not found.');
    return {
      data: await this.prisma.notification.findUniqueOrThrow({ where: { id } }),
    };
  }

  async markAllRead(context: AuthenticatedContext) {
    const workspaceId = this.requireWorkspace(context);
    const result = await this.prisma.notification.updateMany({
      where: { workspaceId, userId: context.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { data: { updatedCount: result.count } };
  }

  private requireWorkspace(context: AuthenticatedContext): string {
    if (!context.workspaceId) throw new NotFoundException('Workspace is required.');
    return context.workspaceId;
  }
}
