import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BitrixService } from './bitrix.service';
import {
  EmitInvoiceDto,
  EmitInvoiceResponseDto,
} from './dto/emit-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * BitrixController
 *
 * Endpoints que reciben webhooks o llamadas desde Bitrix24.
 *
 * Para producción se recomienda también validar el webhook secret
 * de Bitrix24 como capa adicional de seguridad.
 */
@Controller('bitrix')
@UseGuards(JwtAuthGuard)
export class BitrixController {
  constructor(private readonly bitrixService: BitrixService) {}

  /**
   * POST /api/v1/bitrix/emit-invoice
   *
   * Recibe el dealId de Bitrix24, crea la factura en DRAFT
   * y la encola para procesamiento asíncrono.
   *
   * Respuesta inmediata (no espera autorización SRI).
   */
  @Post('emit-invoice')
  @HttpCode(HttpStatus.ACCEPTED)
  async emitInvoice(
    @Body() dto: EmitInvoiceDto,
  ): Promise<EmitInvoiceResponseDto> {
    return this.bitrixService.emitInvoice(dto);
  }
}
