import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = response.getHeader('X-Request-Id')?.toString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : (payload as { message?: string | string[] }).message;
      response.status(status).json({
        error: {
          code: this.httpCode(status),
          message: Array.isArray(message)
            ? 'Request validation failed.'
            : (message ?? exception.message),
          ...(Array.isArray(message)
            ? { details: message.map((entry) => ({ message: entry })) }
            : {}),
          requestId,
        },
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status =
        exception.code === 'P2002'
          ? HttpStatus.CONFLICT
          : exception.code === 'P2025'
            ? HttpStatus.NOT_FOUND
            : exception.code === 'P2003'
              ? HttpStatus.CONFLICT
              : HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        error: {
          code:
            status === HttpStatus.CONFLICT
              ? 'DATABASE_CONFLICT'
              : status === HttpStatus.NOT_FOUND
                ? 'NOT_FOUND'
                : 'INTERNAL_SERVER_ERROR',
          message:
            status === HttpStatus.CONFLICT
              ? 'The operation conflicts with existing related data.'
              : status === HttpStatus.NOT_FOUND
                ? 'The requested record was not found.'
                : 'An unexpected database error occurred.',
          requestId,
        },
      });
      return;
    }

    this.logger.error(
      `Unhandled error for ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId,
      },
    });
  }

  private httpCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      default:
        return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
    }
  }
}
