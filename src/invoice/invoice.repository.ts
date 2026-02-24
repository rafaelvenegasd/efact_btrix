import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Invoice,
  InvoiceEstado,
  Prisma,
  InvoiceAuditLog,
} from '@prisma/client';
import { InvoiceException } from '../common/exceptions/invoice.exception';
import { InvoiceWithItems } from './types/invoice.types';

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.InvoiceCreateInput,
  ): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async findByIdWithItems(id: string): Promise<InvoiceWithItems | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    }) as Promise<InvoiceWithItems | null>;
  }

  async findByClaveAcceso(claveAcceso: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { claveAcceso } });
  }

  async findByDealId(dealId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEstado(
    id: string,
    estado: InvoiceEstado,
    additionalData?: Partial<Prisma.InvoiceUpdateInput>,
  ): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        estado,
        ...additionalData,
      },
    });
  }

  async updateXml(
    id: string,
    xmlGenerado: string,
    claveAcceso: string,
    secuencial: string,
    fechaEmision: Date,
  ): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        xmlGenerado,
        claveAcceso,
        secuencial,
        fechaEmision,
      },
    });
  }

  async updateXmlFirmado(id: string, xmlFirmado: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { xmlFirmado, estado: InvoiceEstado.SIGNED },
    });
  }

  async markAsSent(id: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { estado: InvoiceEstado.SENT },
    });
  }

  async markAsAuthorized(
    id: string,
    sriResponse: unknown,
    authorizedAt: Date,
  ): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        estado: InvoiceEstado.AUTHORIZED,
        sriResponse: sriResponse as Prisma.JsonObject,
        authorizedAt,
      },
    });
  }

  async markAsRejected(
    id: string,
    sriResponse: unknown,
    errorMessage: string,
  ): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        estado: InvoiceEstado.REJECTED,
        sriResponse: sriResponse as Prisma.JsonObject,
        errorMessage,
      },
    });
  }

  async markAsError(id: string, errorMessage: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        estado: InvoiceEstado.ERROR,
        errorMessage,
      },
    });
  }

  async updatePdfPath(id: string, pdfPath: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { pdfPath },
    });
  }

  /**
   * Obtiene y actualiza el secuencial de forma atómica.
   * Usa transacción para evitar duplicados concurrentes.
   */
  async getNextSecuencial(ambiente: string): Promise<string> {
    const result = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.invoiceSequence.upsert({
        where: { ambiente: ambiente as any },
        create: {
          ambiente: ambiente as any,
          current: 1,
        },
        update: {
          current: { increment: 1 },
        },
      });
      return seq.current;
    });

    return String(result).padStart(9, '0');
  }

  async addAuditLog(
    invoiceId: string,
    estado: InvoiceEstado,
    message?: string,
    metadata?: Record<string, unknown>,
  ): Promise<InvoiceAuditLog> {
    return this.prisma.invoiceAuditLog.create({
      data: {
        invoiceId,
        estado,
        message,
        metadata: metadata ? (metadata as Prisma.JsonObject) : undefined,
      },
    });
  }

  async findWithFilters(filters: {
    estado?: InvoiceEstado;
    ambiente?: string;
    dealId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Invoice[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.ambiente && { ambiente: filters.ambiente as any }),
      ...(filters.dealId && { dealId: filters.dealId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total };
  }
}
