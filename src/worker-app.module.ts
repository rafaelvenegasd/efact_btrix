import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { InvoiceModule } from './invoice/invoice.module';
import { SriModule } from './sri/sri.module';
import { SigningProviderModule } from './signing-provider/signing-provider.module';
import { PdfModule } from './pdf/pdf.module';
import { QueuesModule } from './queues/queues.module';
import { WorkerQueuesModule } from './queues/worker-queues.module';

/**
 * Módulo de la aplicación Worker (sin HTTP).
 *
 * Este módulo solo incluye lo necesario para procesar jobs de BullMQ:
 * - Infraestructura (Prisma, Config)
 * - Módulos de negocio (Invoice, SRI, Signing, PDF)
 * - WorkerQueuesModule (registra los processors BullMQ)
 *
 * NO incluye: AuthModule, BitrixController, ni ningún controlador HTTP.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Infraestructura
    PrismaModule,

    // Colas (Producer + Queue registration)
    QueuesModule,

    // Processors BullMQ - Este módulo activa los workers
    WorkerQueuesModule,

    // Servicios de negocio que el processor necesita
    InvoiceModule,
    SriModule,
    SigningProviderModule,
    PdfModule,
  ],
})
export class WorkerAppModule {}
