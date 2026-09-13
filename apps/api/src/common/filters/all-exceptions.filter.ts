import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { sanitizeLogString } from '../utils/log-sanitizer.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred. Please try again later.';
    let errors: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string) || exception.message;
        if (Array.isArray(resObj['message'])) {
          message = resObj['message'][0] || 'Validation failed';
          errors = { validation: resObj['message'] as string[] };
        } else if (typeof resObj['errors'] === 'object') {
          errors = resObj['errors'] as Record<string, string[]>;
        }
      }
    } else if (exception instanceof Error) {
      const sanitizedMsg = sanitizeLogString(exception.message);
      const sanitizedStack = exception.stack ? sanitizeLogString(exception.stack) : undefined;
      this.logger.error(
        `[${requestId || 'NO_ID'}] Unhandled error: ${sanitizedMsg}`,
        sanitizedStack,
      );
      // In production, strictly mask internal error details to prevent information leakage
      if (process.env.NODE_ENV !== 'production') {
        message = sanitizedMsg;
      }
    } else {
      this.logger.error(
        `[${requestId || 'NO_ID'}] Non-error exception caught:`,
        sanitizeLogString(String(exception)),
      );
    }

    const payload = {
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    response.status(status).json(payload);
  }
}
