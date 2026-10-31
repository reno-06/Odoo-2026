import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedContext } from './current-user.decorator';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = context
      .switchToHttp()
      .getRequest<Request & { auth?: AuthenticatedContext }>();
    if (
      request.auth?.role === 'member' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      return true;
    }
    if (!request.auth?.role || !roles.includes(request.auth.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
