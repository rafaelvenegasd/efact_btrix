import { Module } from '@nestjs/common';
import { BitrixController } from './bitrix.controller';
import { BitrixService } from './bitrix.service';
import { InvoiceModule } from '../invoice/invoice.module';
import { QueuesModule } from '../queues/queues.module';

/**
 * BitrixModule
 *
 * Maneja la integración con Bitrix24 CRM.
 * Actualmente: recibe webhooks para emisión de facturas.
 * Futuro: cliente HTTP a Bitrix24 REST API para CRUD de deals.
 */
@Module({
  imports: [
    InvoiceModule,
    QueuesModule,
  ],
  controllers: [BitrixController],
  providers: [BitrixService],
})
export class BitrixModule {}
