import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async list(context: AuthenticatedContext) {
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { userId: context.userId, status: 'active' },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      data: memberships.map(({ workspace, role }) => ({
        ...workspace,
        role,
      })),
    };
  }

  async get(context: AuthenticatedContext, workspaceId: string) {
    await this.requireRole(context.userId, workspaceId, ['owner', 'admin', 'billing', 'member']);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    return { data: workspace };
  }

  async update(
    context: AuthenticatedContext,
    workspaceId: string,
    input: {
      name?: string;
      companyName?: string;
      billingEmail?: string;
      phone?: string;
      address?: string;
      taxId?: string;
      defaultCurrency?: string;
    },
  ) {
    await this.requireRole(context.userId, workspaceId, ['owner', 'admin']);
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('Workspace name cannot be empty.');
    }
    if (input.companyName !== undefined && !input.companyName.trim()) {
      throw new BadRequestException('Company name cannot be empty.');
    }
    if (input.defaultCurrency && !/^[A-Za-z]{3}$/.test(input.defaultCurrency)) {
      throw new BadRequestException('Currency must be a three-letter ISO code.');
    }
    return {
      data: await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.companyName !== undefined
            ? { companyName: input.companyName.trim() }
            : {}),
          ...(input.billingEmail !== undefined
            ? { billingEmail: input.billingEmail.trim().toLowerCase() }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
          ...(input.defaultCurrency
            ? { defaultCurrency: input.defaultCurrency.toUpperCase() }
            : {}),
        },
      }),
    };
  }

  async members(context: AuthenticatedContext, workspaceId: string) {
    await this.requireRole(context.userId, workspaceId, ['owner', 'admin']);
    const members = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { data: members };
  }

  async createInvitation(
    context: AuthenticatedContext,
    workspaceId: string,
    email: string,
    role: string,
  ) {
    await this.requireRole(context.userId, workspaceId, ['owner', 'admin']);
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        user: { email: normalizedEmail },
        status: 'active',
      },
    });
    if (existing) throw new ConflictException('This user is already a workspace member.');
    const token = randomBytes(32).toString('base64url');
    const invite = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdById: context.userId,
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return {
      data: {
        invitation: invite,
        acceptanceToken: token,
        delivery: 'Share the acceptance token securely with the invitee.',
      },
    };
  }

  async acceptInvitation(
    token: string,
    password: string,
    fullName: string,
  ) {
    const normalizedName = fullName.trim();
    if (!normalizedName) {
      throw new BadRequestException('Full name cannot be empty.');
    }
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invitation is invalid or expired.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.workspaceInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invitation is invalid or expired.');
      }
      let user = await transaction.user.findUnique({
        where: { email: invitation.email },
      });
      if (user && user.status !== 'active') {
        throw new ConflictException('This account is not available for invitations.');
      }
      if (!user) {
        user = await transaction.user.create({
          data: {
            email: invitation.email,
            fullName: normalizedName,
            passwordHash: await this.auth.hashPassword(password),
            status: 'active',
          },
        });
      }
      await transaction.workspaceMembership.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
          },
        },
        update: { status: 'active', role: invitation.role },
        create: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          status: 'active',
        },
      });
      return {
        data: {
          user: { id: user.id, email: user.email, fullName: user.fullName },
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      };
    });
  }

  async updateMember(
    actorId: string,
    workspaceId: string,
    userId: string,
    role: string,
  ) {
    await this.requireRole(actorId, workspaceId, ['owner', 'admin']);
    if (actorId === userId) {
      throw new BadRequestException('You cannot change your own workspace role.');
    }
    const current = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!current) throw new NotFoundException('Workspace member not found.');
    if (current.role === 'owner') {
      throw new ForbiddenException('Workspace ownership cannot be changed here.');
    }
    return {
      data: await this.prisma.workspaceMembership.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role },
      }),
    };
  }

  async removeMember(actorId: string, workspaceId: string, userId: string) {
    await this.requireRole(actorId, workspaceId, ['owner', 'admin']);
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException('Workspace member not found.');
    if (membership.role === 'owner') {
      throw new ForbiddenException('The workspace owner cannot be removed.');
    }
    await this.prisma.workspaceMembership.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return { data: { success: true } };
  }

  private async requireRole(
    userId: string,
    workspaceId: string,
    roles: string[],
  ): Promise<void> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true, status: true },
    });
    if (
      !membership ||
      membership.status !== 'active' ||
      !roles.includes(membership.role)
    ) {
      throw new ForbiddenException('Workspace administration permission is required.');
    }
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
