import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || message;
        errors = Array.isArray(resp.message) ? resp.message : undefined;
        if (errors) {
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      // Log full error details server-side only
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      // Don't expose internal error details in production
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    // Log non-500 errors at warn level for debugging
    if (status >= 500) {
      this.logger.error(`${status} ${request.method} ${request.url} - ${message}`);
    } else if (status >= 400) {
      this.logger.warn(`${status} ${request.method} ${request.url} - ${message}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
