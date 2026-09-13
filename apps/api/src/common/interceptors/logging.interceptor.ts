import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, url } = req;
    const requestId = (req.headers['x-request-id'] as string) || 'NO_ID';
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Math.round((performance.now() - start) * 100) / 100;
          const statusCode = res.statusCode;
          this.logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              requestId,
              method,
              url,
              statusCode,
              durationMs,
            }),
          );
        },
        error: (err) => {
          const durationMs = Math.round((performance.now() - start) * 100) / 100;
          const statusCode = err.status || 500;
          this.logger.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              requestId,
              method,
              url,
              statusCode,
              durationMs,
              error: err.message,
            }),
          );
        },
      }),
    );
  }
}
