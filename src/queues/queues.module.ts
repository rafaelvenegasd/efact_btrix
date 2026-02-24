import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './constants/queue.constants';
import { InvoiceProducer } from './producers/invoice.producer';
import { InvoiceModule } from '../invoice/invoice.module';

/**
 * QueuesModule
 *
 * Configura BullMQ con Redis y registra la cola de invoice-processing.
 * Provee el InvoiceProducer para encolar jobs.
 *
 * Este módulo es importado tanto por:
 * - AppModule (API server): solo necesita el producer
 * - WorkerAppModule (Worker): necesita el producer + los processors
 *   (los processors se registran en WorkerQueuesModule)
 */
@Module({
  imports: [
    // Configuración global de BullMQ con Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password:
            configService.get<string>('redis.password') || undefined,
          // Configuración de retry para conexiones Redis
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Registro de la cola principal
    BullModule.registerQueue({
      name: QUEUE_NAMES.INVOICE_PROCESSING,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,    // 24 horas
          count: 1000,
        },
        removeOnFail: {
          age: 604800,   // 7 días
        },
      },
    }),

    // InvoiceModule para que InvoiceProducer pueda inyectar InvoiceService
    InvoiceModule,
  ],
  providers: [InvoiceProducer],
  exports: [BullModule, InvoiceProducer],
})
export class QueuesModule {}
