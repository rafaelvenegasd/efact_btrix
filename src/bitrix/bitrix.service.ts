import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceProducer } from '../queues/producers/invoice.producer';
import {
  EmitInvoiceDto,
  EmitInvoiceResponseDto,
} from './dto/emit-invoice.dto';
import { Ambiente } from '@prisma/client';

/**
 * BitrixService
 *
 * Orquesta el flujo iniciado desde Bitrix24:
 * 1. Obtiene/valida datos del deal (futuro: llamar a Bitrix24 API)
 * 2. Crea la factura en estado DRAFT
 * 3. Encola el proceso de emisión
 *
 * La integración real con Bitrix24 API se implementará cuando
 * el módulo Bitrix esté completo.
 */
@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoiceProducer: InvoiceProducer,
    private readonly configService: ConfigService,
  ) {}

  async emitInvoice(dto: EmitInvoiceDto): Promise<EmitInvoiceResponseDto> {
    const ambiente =
      dto.ambiente ||
      (this.configService.get<string>('sri.env') as Ambiente) ||
      Ambiente.TEST;

    this.logger.log(
      `Iniciando emisión de factura para dealId: ${dto.dealId} | Ambiente: ${ambiente}`,
    );

    // Paso 1: Obtener datos del deal (por ahora mock, futuro: Bitrix24 API)
    const dealData = await this.fetchDealData(dto.dealId, dto);

    // Paso 2: Crear factura en estado DRAFT
    const invoice = await this.invoiceService.createDraft({
      dealId: dto.dealId,
      ambiente,
      comprador: dealData.comprador,
      items: dealData.items,
    });

    // Paso 3: Encolar el proceso de emisión
    await this.invoiceProducer.enqueueInvoiceProcessing(invoice.id);

    this.logger.log(
      `Factura ${invoice.id} creada y encolada para dealId: ${dto.dealId}`,
    );

    return {
      invoiceId: invoice.id,
      status: invoice.estado,
      message: 'Factura creada correctamente',
    };
  }

  /**
   * Obtiene los datos del deal de Bitrix24.
   *
   * IMPLEMENTACIÓN FUTURA: Llamar a Bitrix24 REST API
   * https://helpdesk.bitrix24.com/open/17611898/
   *
   * Por ahora usa los datos enviados en el request o genera mock data.
   */
  private async fetchDealData(
    dealId: string,
    dto: EmitInvoiceDto,
  ): Promise<{
    comprador: EmitInvoiceDto['comprador'];
    items: EmitInvoiceDto['items'];
  }> {
    // Si el request ya trae los datos, usarlos directamente
    if (dto.comprador && dto.items && dto.items.length > 0) {
      this.logger.debug(`Usando datos del request para dealId: ${dealId}`);
      return {
        comprador: dto.comprador,
        items: dto.items,
      };
    }

    // TODO: Implementar llamada a Bitrix24 API
    // const bitrixDeal = await this.bitrixApiClient.getDeal(dealId);
    // const bitrixContact = await this.bitrixApiClient.getContact(bitrixDeal.CONTACT_ID);
    // return this.mapBitrixDealToInvoiceData(bitrixDeal, bitrixContact);

    this.logger.warn(
      `Mock data para dealId: ${dealId} - Implementar integración Bitrix24 API`,
    );

    // Mock data para desarrollo - REEMPLAZAR con API real
    return {
      comprador: {
        tipoIdentificacion: '07',
        razonSocial: 'CONSUMIDOR FINAL',
        identificacion: '9999999999999',
      },
      items: [
        {
          codigoPrincipal: 'SRV001',
          descripcion: `Servicio Deal #${dealId}`,
          cantidad: 1,
          precioUnitario: 100.0,
          descuento: 0,
        },
      ],
    };
  }
}
