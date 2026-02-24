import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');

    // Middleware para logging de queries lentas (>1s)
    this.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `Query lenta: ${params.model}.${params.action} - ${duration}ms`,
        );
      }

      return result;
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada');
  }

  /**
   * Limpieza para tests de integración
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase solo puede usarse en ambiente de test');
    }
    await this.$transaction([
      this.invoiceAuditLog.deleteMany(),
      this.invoiceItem.deleteMany(),
      this.invoice.deleteMany(),
      this.invoiceSequence.deleteMany(),
      this.company.deleteMany(),
    ]);
  }
}
