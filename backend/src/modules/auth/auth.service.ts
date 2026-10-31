import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthSession, Prisma } from '@prisma/client';
import {
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from './mail.service';

const scrypt = promisify(scryptCallback);
const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

interface AccessClaims {
  sub: string;
  sid: string;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async login(email: string, password: string): Promise<{
    user: { id: string; email: string; fullName: string };
    workspaces: Array<{ id: string; name: string; role: string }>;
    tokens: TokenPair;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        memberships: {
          where: { status: 'active' },
          include: { workspace: true },
        },
      },
    });
    const passwordMatches = await this.verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== 'active' || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const sessionId = randomUUID();
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = this.hash(refreshToken, this.refreshSecret());
    const session = await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      workspaces: user.memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
      })),
      tokens: this.createTokenPair(user.id, session, refreshToken),
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!/^[A-Za-z0-9_-]{64}$/.test(refreshToken)) {
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }
    const refreshTokenHash = this.hash(refreshToken, this.refreshSecret());
    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextRefreshTokenHash = this.hash(nextRefreshToken, this.refreshSecret());
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.authSession.findUnique({
        where: { refreshTokenHash },
        include: { user: true },
      });
      const now = new Date();
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= now ||
        session.user.status !== 'active'
      ) {
        throw new UnauthorizedException('Refresh session is invalid or expired.');
      }

      const claimed = await transaction.authSession.updateMany({
        where: {
          id: session.id,
          refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          refreshTokenHash: nextRefreshTokenHash,
          lastUsedAt: now,
        },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('Refresh session is invalid or expired.');
      }
      return this.createTokenPair(
        session.userId,
        { id: session.id },
        nextRefreshToken,
      );
    });
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.hash(refreshToken, this.refreshSecret()),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  verifyAccessToken(token: string): AccessClaims {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new UnauthorizedException('Access token is invalid.');
    }
    const [headerPart, payloadPart, signature] = parts;
    const expected = createHmac('sha256', this.accessSecret())
      .update(`${headerPart}.${payloadPart}`)
      .digest('base64url');
    const expectedBytes = Buffer.from(expected);
    const signatureBytes = Buffer.from(signature);
    if (
      expectedBytes.length !== signatureBytes.length ||
      !timingSafeEqual(expectedBytes, signatureBytes)
    ) {
      throw new UnauthorizedException('Access token is invalid.');
    }
    let header: unknown;
    try {
      header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Access token is invalid.');
    }
    if (
      !header ||
      typeof header !== 'object' ||
      !('alg' in header) ||
      !('typ' in header) ||
      header.alg !== 'HS256' ||
      header.typ !== 'JWT'
    ) {
      throw new UnauthorizedException('Access token is invalid.');
    }
    let claims: unknown;
    try {
      claims = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      );
    } catch {
      throw new UnauthorizedException('Access token is invalid.');
    }
    if (!claims || typeof claims !== 'object') {
      throw new UnauthorizedException('Access token is invalid.');
    }
    const accessClaims = claims as Partial<AccessClaims>;
    if (
      typeof accessClaims.sub !== 'string' ||
      !accessClaims.sub ||
      typeof accessClaims.sid !== 'string' ||
      !accessClaims.sid ||
      !Number.isInteger(accessClaims.exp) ||
      (accessClaims.exp as number) <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('Access token has expired.');
    }
    return accessClaims as AccessClaims;
  }

  async getRequestContext(
    userId: string,
    requestedWorkspaceId?: string,
    sessionId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: 'active' },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('User session is invalid.');
    if (sessionId) {
      const session = await this.prisma.authSession.findFirst({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) throw new UnauthorizedException('Session is invalid or expired.');
    }
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { userId, status: 'active' },
      select: { workspaceId: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!memberships.length) return { userId };
    const membership = requestedWorkspaceId
      ? memberships.find((entry) => entry.workspaceId === requestedWorkspaceId)
      : memberships[0];
    if (!membership) {
      throw new UnauthorizedException('You do not have access to this workspace.');
    }
    return {
      userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await this.hashPassword(newPassword) },
      }),
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status !== 'active') return;

    const recentCount = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= 3) return;

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      }),
    ]);
    await this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.$transaction(async (transaction) => {
      const reset = await transaction.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
      const now = new Date();
      if (!reset || reset.usedAt || reset.expiresAt <= now) {
        throw new BadRequestException('Password reset token is invalid or expired.');
      }
      const passwordHash = await this.hashPassword(newPassword);
      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Password reset token is invalid or expired.');
      }
      await transaction.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      });
      await transaction.authSession.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [algorithm, salt, hash] = stored.split('$');
    if (
      algorithm !== 'scrypt' ||
      !salt ||
      !/^[a-f\d]{32}$/.test(salt) ||
      !hash ||
      !/^[a-f\d]{128}$/.test(hash)
    ) {
      return false;
    }
    const expected = Buffer.from(hash, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  private createTokenPair(
    userId: string,
    session: Pick<AuthSession, 'id'>,
    refreshToken = '',
  ): TokenPair {
    const ttl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const expiresInSeconds = this.parseDuration(ttl);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        sid: session.id,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      }),
    ).toString('base64url');
    const unsigned = `${header}.${payload}`;
    const signature = createHmac('sha256', this.accessSecret())
      .update(unsigned)
      .digest('base64url');
    return {
      accessToken: `${unsigned}.${signature}`,
      refreshToken,
      accessTokenExpiresIn: ttl,
    };
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) throw new Error('JWT_ACCESS_TTL must be a duration like 15m or 1h.');
    const count = Number(match[1]);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
    return count * unit;
  }

  private refreshExpiry(): Date {
    const ttl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    return new Date(Date.now() + this.parseDuration(ttl) * 1000);
  }

  private accessSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private refreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private hash(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('hex');
  }
}
