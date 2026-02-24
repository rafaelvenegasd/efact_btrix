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

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      responseBody =
        typeof exceptionResponse === 'string'
          ? {
              statusCode: status,
              message: exceptionResponse,
              error: 'Error',
            }
          : (exceptionResponse as Record<string, unknown>);
    } else {
      const error = exception as Error;
      this.logger.error(
        `Excepción no controlada: ${error?.message}`,
        error?.stack,
      );

      responseBody = {
        statusCode: status,
        message: 'Error interno del servidor',
        error: 'Internal Server Error',
      };
    }

    this.logger.error(
      `[${request.method}] ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      ...responseBody,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
