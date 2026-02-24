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
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, body, ip } = request;
    const start = Date.now();

    this.logger.log(
      `→ [${method}] ${url} | IP: ${ip} | Body: ${this.sanitizeBody(body)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `← [${method}] ${url} | ${response.statusCode} | ${duration}ms`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `← [${method}] ${url} | ERROR | ${duration}ms | ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): string {
    if (!body || Object.keys(body).length === 0) return '{}';

    // Ocultar campos sensibles
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'cert', 'key'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) sanitized[field] = '***';
    });

    return JSON.stringify(sanitized);
  }
}
