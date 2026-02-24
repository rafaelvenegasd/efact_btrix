import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Invoice, InvoiceEstado } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceRepository } from './invoice.repository';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  /**
   * GET /api/v1/invoices
   */
  @Get()
  async list(
    @Query('status') status?: InvoiceEstado,
    @Query('dealId') dealId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.invoiceRepository.findWithFilters({
      estado: status,
      dealId,
      page: +page,
      limit: +limit,
    });

    return {
      data: result.data.map(toInvoiceResponse),
      total: result.total,
      page: +page,
      limit: +limit,
    };
  }

  /**
   * GET /api/v1/invoices/:id/status
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundException(`Factura ${id} no encontrada`);

    return {
      id: invoice.id,
      status: invoice.estado,
      updatedAt: invoice.updatedAt,
      authorizationNumber: invoice.claveAcceso ?? null,
      rejectionReason: invoice.errorMessage ?? null,
    };
  }

  /**
   * GET /api/v1/invoices/:id
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundException(`Factura ${id} no encontrada`);
    return toInvoiceResponse(invoice);
  }
}

function toInvoiceResponse(invoice: Invoice) {
  return {
    id: invoice.id,
    accessKey: invoice.claveAcceso ?? null,
    status: invoice.estado,
    issueDate: invoice.fechaEmision ?? null,
    buyerName: invoice.razonSocialComprador ?? null,
    buyerTaxId: invoice.identificacionComprador ?? null,
    totalAmount: invoice.importeTotal != null ? Number(invoice.importeTotal) : null,
    currency: 'USD',
    pdfUrl: invoice.pdfPath ?? null,
    xmlUrl: null,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}
