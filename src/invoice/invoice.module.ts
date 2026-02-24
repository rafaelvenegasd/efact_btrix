import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceXmlBuilder } from './xml/invoice-xml.builder';
import { InvoiceController } from './invoice.controller';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository, InvoiceXmlBuilder],
  exports: [InvoiceService],
})
export class InvoiceModule {}
