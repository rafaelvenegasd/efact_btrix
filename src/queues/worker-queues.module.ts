import { Module } from '@nestjs/common';
import { InvoiceProcessingProcessor } from './processors/invoice-processing.processor';
import { QueuesModule } from './queues.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { SriModule } from '../sri/sri.module';
import { SigningProviderModule } from '../signing-provider/signing-provider.module';
import { PdfModule } from '../pdf/pdf.module';

/**
 * WorkerQueuesModule
 *
 * Extiende QueuesModule con los Processors de BullMQ.
 * SOLO se importa en WorkerAppModule, NUNCA en AppModule.
 *
 * Al declarar InvoiceProcessingProcessor como provider,
 * @nestjs/bullmq automáticamente lo conecta como worker de Redis.
 */
@Module({
  imports: [
    QueuesModule, // Provee BullModule.forRootAsync + BullModule.registerQueue (necesario para @InjectQueue)
    InvoiceModule,
    SriModule,
    SigningProviderModule,
    PdfModule,
  ],
  providers: [InvoiceProcessingProcessor],
})
export class WorkerQueuesModule {}
