import { Module } from '@nestjs/common';
import { SriService } from './sri.service';
import { SriSoapAdapter } from './adapters/sri-soap.adapter';

@Module({
  providers: [SriService, SriSoapAdapter],
  exports: [SriService],
})
export class SriModule {}
