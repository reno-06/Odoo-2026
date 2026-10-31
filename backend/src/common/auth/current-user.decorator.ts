import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedContext {
  userId: string;
  workspaceId?: string;
  role?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedContext => {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedContext }>();
    if (!request.auth) {
      throw new UnauthorizedException('Authentication is required.');
    }
    return request.auth;
  },
);
