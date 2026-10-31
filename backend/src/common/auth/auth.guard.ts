import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { auth?: { userId: string; workspaceId?: string; role?: string } }>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const claims = this.authService.verifyAccessToken(match[1]);
    const workspaceHeader = request.headers['x-workspace-id'];
    const workspaceId = Array.isArray(workspaceHeader)
      ? workspaceHeader[0]
      : workspaceHeader;
    const auth = await this.authService.getRequestContext(
      claims.sub,
      workspaceId,
      claims.sid,
    );
    request.auth = auth;
    return true;
  }
}
