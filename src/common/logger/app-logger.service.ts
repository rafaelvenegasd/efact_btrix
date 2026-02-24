import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Logger estructurado basado en Winston.
 * Produce JSON en producción y formato legible en desarrollo.
 */
@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(private context?: string) {
    const isDev = process.env.NODE_ENV !== 'production';

    this.logger = winston.createLogger({
      level: isDev ? 'debug' : 'info',
      defaultMeta: {
        service: 'efact-btrix',
        context: this.context,
      },
      format: isDev
        ? combine(
            colorize({ all: true }),
            timestamp({ format: 'HH:mm:ss' }),
            errors({ stack: true }),
            printf(({ timestamp, level, message, context, stack, ...meta }) => {
              const ctx = context || this.context || '';
              const extra = Object.keys(meta).length
                ? ` ${JSON.stringify(meta)}`
                : '';
              return `${timestamp} [${level}] [${ctx}] ${message}${stack ? '\n' + stack : ''}${extra}`;
            }),
          )
        : combine(timestamp(), errors({ stack: true }), json()),
      transports: [new winston.transports.Console()],
    });
  }

  setContext(context: string): void {
    this.context = context;
    this.logger.defaultMeta = {
      ...this.logger.defaultMeta,
      context,
    };
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Log estructurado con metadata adicional
   */
  logWithMeta(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    meta: Record<string, unknown>,
  ): void {
    this.logger[level](message, { ...meta, context: this.context });
  }
}
