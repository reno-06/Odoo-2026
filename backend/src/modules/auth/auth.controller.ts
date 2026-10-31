import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser, AuthenticatedContext } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './auth.dto';
import { PrismaService } from '../../database/prisma.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input.email, input.password);
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return {
      data: {
        user: result.user,
        workspaces: result.workspaces,
        accessToken: result.tokens.accessToken,
        accessTokenExpiresIn: result.tokens.accessTokenExpiresIn,
      },
    };
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.getRefreshCookie(request);
    if (!token) throw new UnauthorizedException('Refresh session is required.');
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(response, result.refreshToken);
    return {
      data: {
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
      },
    };
  }

  @Post('logout')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.getRefreshCookie(request));
    this.clearRefreshCookie(response);
    return { data: { success: true } };
  }

  @Get('session')
  @Header('Cache-Control', 'no-store')
  async session(@CurrentUser() context: AuthenticatedContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        memberships: {
          where: { status: 'active' },
          select: {
            role: true,
            workspace: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User session is invalid.');
    return { data: user };
  }

  @Post('password/change')
  @Header('Cache-Control', 'no-store')
  async changePassword(
    @CurrentUser() context: AuthenticatedContext,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.changePassword(
      context.userId,
      input.currentPassword,
      input.newPassword,
    );
    this.clearRefreshCookie(response);
    return { data: { success: true } };
  }

  @Public()
  @Post('password/forgot')
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @Header('Cache-Control', 'no-store')
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(input.email);
    return { data: { success: true } };
  }

  @Public()
  @Post('password/reset')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async resetPassword(
    @Body() input: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.resetPassword(input.token, input.newPassword);
    this.clearRefreshCookie(response);
    return { data: { success: true } };
  }

  private setRefreshCookie(response: Response, token: string): void {
    const secure = this.config.get('NODE_ENV') === 'production' ? '; Secure' : '';
    const ttl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const seconds = this.durationSeconds(ttl);
    response.setHeader(
      'Set-Cookie',
      `brightloop_refresh=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=${seconds}${secure}`,
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.setHeader(
      'Set-Cookie',
      `brightloop_refresh=; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=0${this.config.get('NODE_ENV') === 'production' ? '; Secure' : ''}`,
    );
  }

  private getRefreshCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    const raw = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('brightloop_refresh='))
      ?.slice('brightloop_refresh='.length);
    if (!raw) return undefined;
    try {
      return decodeURIComponent(raw);
    } catch {
      return undefined;
    }
  }

  private durationSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) throw new Error('JWT_REFRESH_TTL must be a duration like 7d.');
    const factors: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return Number(match[1]) * factors[match[2]];
  }
}
