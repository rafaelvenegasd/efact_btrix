import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice, InvoiceEstado, Prisma, TipoIdentificacion } from '@prisma/client';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceXmlBuilder } from './xml/invoice-xml.builder';
import { generateClaveAcceso } from './utils/clave-acceso.util';
import {
  CreateInvoiceDraftInput,
  CompanyData,
  InvoiceXmlData,
  InvoiceXmlItem,
  SRI_CONSTANTS,
  InvoiceWithItems,
} from './types/invoice.types';
import { InvoiceException } from '../common/exceptions/invoice.exception';

/**
 * InvoiceService
 *
 * Orquesta toda la lógica de negocio de facturas electrónicas.
 * Es el servicio central que coordina:
 * - Creación de borradores
 * - Generación de XML
 * - Actualización de estados
 * - Registro de audit logs
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly xmlBuilder: InvoiceXmlBuilder,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crea una factura en estado DRAFT.
   * Punto de entrada del flujo de emisión.
   */
  async createDraft(input: CreateInvoiceDraftInput): Promise<Invoice> {
    this.logger.log(`Creando factura DRAFT para dealId: ${input.dealId}`);

    // Mapear TipoIdentificacion al enum de Prisma
    const tipoIdMap: Record<string, TipoIdentificacion> = {
      '04': TipoIdentificacion.RUC,
      '05': TipoIdentificacion.CEDULA,
      '06': TipoIdentificacion.PASAPORTE,
      '07': TipoIdentificacion.CONSUMIDOR_FINAL,
    };

    const createData: Prisma.InvoiceCreateInput = {
      dealId: input.dealId,
      ambiente: input.ambiente,
      tipoIdentificacionComprador: input.comprador?.tipoIdentificacion
        ? tipoIdMap[input.comprador.tipoIdentificacion] || TipoIdentificacion.CONSUMIDOR_FINAL
        : undefined,
      razonSocialComprador: input.comprador?.razonSocial,
      identificacionComprador: input.comprador?.identificacion,
      emailComprador: input.comprador?.email,
    };

    // Crear la factura
    const invoice = await this.invoiceRepository.create(createData);

    // Crear items si se proporcionaron
    if (input.items && input.items.length > 0) {
      const totals = this.xmlBuilder.calculateTotals(input.items);

      // Actualizar totales en la factura
      await this.invoiceRepository.updateEstado(invoice.id, InvoiceEstado.DRAFT, {
        totalSinImpuestos: totals.totalSinImpuestos,
        totalDescuento: totals.totalDescuento,
        totalIva: totals.totalIva,
        importeTotal: totals.importeTotal,
        items: {
          create: input.items.map((item, index) => {
            const processed = totals.processedItems[index];
            return {
              codigoPrincipal: item.codigoPrincipal,
              codigoAuxiliar: item.codigoAuxiliar,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              descuento: processed.descuento,
              precioTotalSinImpuesto: processed.precioTotalSinImpuesto,
              ivaBaseImponible: processed.ivaBase,
              ivaValor: processed.ivaValor,
              ivaTarifa: processed.ivaTarifa,
            };
          }),
        },
      });
    }

    // Registrar en audit log
    await this.invoiceRepository.addAuditLog(
      invoice.id,
      InvoiceEstado.DRAFT,
      `Factura creada para dealId: ${input.dealId}`,
    );

    this.logger.log(`Factura ${invoice.id} creada en DRAFT`);
    return invoice;
  }

  /**
   * Genera el XML de la factura y obtiene su clave de acceso.
   * Transiciona el estado a: contiene XML generado.
   */
  async generateXml(invoiceId: string): Promise<{
    xml: string;
    claveAcceso: string;
    secuencial: string;
    fechaEmision: Date;
  }> {
    const invoice = await this.invoiceRepository.findByIdWithItems(invoiceId);

    if (!invoice) {
      throw InvoiceException.notFound(invoiceId);
    }

    if (invoice.estado !== InvoiceEstado.DRAFT) {
      throw InvoiceException.invalidState(invoiceId, invoice.estado, [
        InvoiceEstado.DRAFT,
      ]);
    }

    const company = this.getCompanyData();
    const fechaEmision = new Date();

    // Obtener secuencial único de forma atómica
    const secuencial = await this.invoiceRepository.getNextSecuencial(
      invoice.ambiente,
    );

    // Generar clave de acceso
    const claveAcceso = generateClaveAcceso({
      fechaEmision,
      tipoComprobante: SRI_CONSTANTS.TIPO_COMPROBANTE_FACTURA,
      ruc: company.ruc,
      ambiente: invoice.ambiente,
      establecimiento: company.establecimiento,
      puntoEmision: company.puntoEmision,
      secuencial,
    });

    this.logger.log(
      `Clave de acceso generada: ${claveAcceso} para factura ${invoiceId}`,
    );

    // Construir datos para XML
    const xmlData = this.buildXmlData(invoice, company, {
      secuencial,
      claveAcceso,
      fechaEmision,
    });

    // Generar XML
    const xml = this.xmlBuilder.buildFacturaXml(xmlData);

    // Persistir XML y clave de acceso
    await this.invoiceRepository.updateXml(
      invoiceId,
      xml,
      claveAcceso,
      secuencial,
      fechaEmision,
    );

    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.DRAFT,
      `XML generado. Clave: ${claveAcceso}`,
      { secuencial, claveAcceso },
    );

    return { xml, claveAcceso, secuencial, fechaEmision };
  }

  /**
   * Actualiza la factura con el XML firmado y cambia estado a SIGNED.
   */
  async updateXmlFirmado(invoiceId: string, xmlFirmado: string): Promise<void> {
    await this.invoiceRepository.updateXmlFirmado(invoiceId, xmlFirmado);
    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.SIGNED,
      'XML firmado con XAdES-BES',
    );
    this.logger.log(`Factura ${invoiceId} → SIGNED`);
  }

  /**
   * Marca la factura como enviada al SRI.
   */
  async markAsSent(invoiceId: string): Promise<void> {
    await this.invoiceRepository.markAsSent(invoiceId);
    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.SENT,
      'Enviada a recepción SRI',
    );
    this.logger.log(`Factura ${invoiceId} → SENT`);
  }

  /**
   * Marca la factura como autorizada por el SRI.
   */
  async markAsAuthorized(
    invoiceId: string,
    sriResponse: unknown,
  ): Promise<void> {
    const now = new Date();
    await this.invoiceRepository.markAsAuthorized(invoiceId, sriResponse, now);
    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.AUTHORIZED,
      'Autorizada por SRI',
      { sriResponse },
    );
    this.logger.log(`Factura ${invoiceId} → AUTHORIZED`);
  }

  /**
   * Marca la factura como rechazada por el SRI.
   */
  async markAsRejected(
    invoiceId: string,
    sriResponse: unknown,
    errorMessage: string,
  ): Promise<void> {
    await this.invoiceRepository.markAsRejected(
      invoiceId,
      sriResponse,
      errorMessage,
    );
    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.REJECTED,
      `Rechazada por SRI: ${errorMessage}`,
      { sriResponse },
    );
    this.logger.warn(`Factura ${invoiceId} → REJECTED: ${errorMessage}`);
  }

  /**
   * Marca la factura con error de proceso.
   */
  async markAsError(invoiceId: string, errorMessage: string): Promise<void> {
    await this.invoiceRepository.markAsError(invoiceId, errorMessage);
    await this.invoiceRepository.addAuditLog(
      invoiceId,
      InvoiceEstado.ERROR,
      `Error: ${errorMessage}`,
    );
    this.logger.error(`Factura ${invoiceId} → ERROR: ${errorMessage}`);
  }

  /**
   * Actualiza la ruta del PDF generado.
   */
  async updatePdfPath(invoiceId: string, pdfPath: string): Promise<void> {
    await this.invoiceRepository.updatePdfPath(invoiceId, pdfPath);
    this.logger.log(`PDF generado para factura ${invoiceId}: ${pdfPath}`);
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoiceRepository.findById(id);
  }

  async findByIdWithItems(id: string): Promise<InvoiceWithItems | null> {
    return this.invoiceRepository.findByIdWithItems(id);
  }

  /**
   * Construye los datos de la empresa desde la configuración.
   */
  getCompanyData(): CompanyData {
    return {
      ruc: this.configService.get<string>('company.ruc') || '',
      razonSocial: this.configService.get<string>('company.razonSocial') || '',
      nombreComercial:
        this.configService.get<string>('company.nombreComercial') || '',
      dirMatriz: this.configService.get<string>('company.dirMatriz') || '',
      dirEstablecimiento:
        this.configService.get<string>('company.dirEstablecimiento') || '',
      contribuyenteEspecial:
        this.configService.get<string>('company.contribuyenteEspecial') || '',
      obligadoContabilidad:
        this.configService.get<string>('company.obligadoContabilidad') || 'SI',
      establecimiento:
        this.configService.get<string>('company.establecimiento') || '001',
      puntoEmision:
        this.configService.get<string>('company.puntoEmision') || '001',
    };
  }

  /**
   * Construye el objeto de datos para el XML builder.
   */
  private buildXmlData(
    invoice: InvoiceWithItems,
    company: CompanyData,
    identifiers: {
      secuencial: string;
      claveAcceso: string;
      fechaEmision: Date;
    },
  ): InvoiceXmlData {
    // Mapear tipo identificación
    const tipoIdReverseMap: Record<string, string> = {
      RUC: SRI_CONSTANTS.TIPO_IDENTIFICACION.RUC,
      CEDULA: SRI_CONSTANTS.TIPO_IDENTIFICACION.CEDULA,
      PASAPORTE: SRI_CONSTANTS.TIPO_IDENTIFICACION.PASAPORTE,
      CONSUMIDOR_FINAL: SRI_CONSTANTS.TIPO_IDENTIFICACION.CONSUMIDOR_FINAL,
    };

    const tipoId = invoice.tipoIdentificacionComprador
      ? tipoIdReverseMap[invoice.tipoIdentificacionComprador] || '07'
      : '07';

    // Construir items para XML
    const xmlItems: InvoiceXmlItem[] = invoice.items.map((item) => ({
      codigoPrincipal: item.codigoPrincipal,
      codigoAuxiliar: item.codigoAuxiliar || undefined,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      descuento: Number(item.descuento),
      precioTotalSinImpuesto: Number(item.precioTotalSinImpuesto),
      ivaBase: Number(item.ivaBaseImponible),
      ivaValor: Number(item.ivaValor),
      ivaTarifa: Number(item.ivaTarifa),
    }));

    // Recalcular totales desde los items
    const totalSinImpuestos = xmlItems.reduce(
      (acc, i) => acc + i.precioTotalSinImpuesto,
      0,
    );
    const totalDescuento = xmlItems.reduce((acc, i) => acc + i.descuento, 0);
    const totalIva = xmlItems.reduce((acc, i) => acc + i.ivaValor, 0);
    const importeTotal = Math.round((totalSinImpuestos + totalIva) * 100) / 100;

    return {
      company,
      ambiente: invoice.ambiente,
      secuencial: identifiers.secuencial,
      claveAcceso: identifiers.claveAcceso,
      fechaEmision: identifiers.fechaEmision,
      tipoIdentificacionComprador: tipoId,
      razonSocialComprador: invoice.razonSocialComprador || 'CONSUMIDOR FINAL',
      identificacionComprador: invoice.identificacionComprador || '9999999999999',
      emailComprador: invoice.emailComprador || undefined,
      items: xmlItems,
      totalSinImpuestos,
      totalDescuento,
      totalIva,
      importeTotal,
    };
  }
}
