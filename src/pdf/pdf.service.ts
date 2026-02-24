import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { InvoiceWithItems } from '../invoice/types/invoice.types';

/**
 * PdfService
 *
 * Genera el RIDE (Representación Impresa del Documento Electrónico)
 * requerido por el SRI para facturas electrónicas autorizadas.
 *
 * ESTADO ACTUAL: Implementación mock que genera un archivo de texto.
 *
 * IMPLEMENTACIÓN REAL recomendada:
 * Opción A: PDFKit (npm install pdfkit @types/pdfkit)
 * Opción B: Puppeteer con template HTML (más flexible para diseño)
 * Opción C: jsPDF
 *
 * El RIDE debe incluir (según especificación SRI):
 * - Logo de la empresa
 * - Datos del emisor (RUC, nombre, dirección)
 * - Número de autorización
 * - Fecha de autorización
 * - Datos del comprador
 * - Detalle de items
 * - Totales e impuestos
 * - Código QR con la clave de acceso
 * - Leyenda: "DOCUMENTO AUTORIZADO"
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir: string;

  constructor(private readonly configService: ConfigService) {
    this.outputDir = configService.get<string>(
      'pdf.outputDir',
      './storage/pdfs',
    );
    this.ensureOutputDirExists();
  }

  /**
   * Genera el RIDE de la factura autorizada.
   *
   * @param invoice Factura con items y datos completos
   * @param sriResponse Respuesta de autorización del SRI
   * @returns Ruta absoluta del PDF generado
   */
  async generateRide(
    invoice: InvoiceWithItems,
    sriResponse?: Record<string, unknown>,
  ): Promise<string> {
    this.logger.log(
      `Generando RIDE para factura: ${invoice.id} | Clave: ${invoice.claveAcceso}`,
    );

    const filename = `RIDE_${invoice.claveAcceso || invoice.id}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    // ---- IMPLEMENTACIÓN REAL (reemplazar el mock abajo) ----
    // Opción A: PDFKit
    // const doc = new PDFDocument({ size: 'A4', margin: 50 });
    // const writeStream = fs.createWriteStream(outputPath);
    // doc.pipe(writeStream);
    // await this.buildRideContent(doc, invoice, sriResponse);
    // doc.end();
    // await new Promise((resolve) => writeStream.on('finish', resolve));

    // ---- MOCK: Genera archivo de texto con estructura del RIDE ----
    await this.generateMockRide(invoice, sriResponse, outputPath);

    this.logger.log(`RIDE generado: ${outputPath}`);
    return outputPath;
  }

  /**
   * Genera una versión del RIDE en HTML (útil para preview en frontend).
   */
  async generateRideHtml(invoice: InvoiceWithItems): Promise<string> {
    const sriResp = invoice.sriResponse as Record<string, unknown> | null;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>RIDE - ${invoice.claveAcceso}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .section { margin-top: 15px; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f0f0f0; padding: 5px; border: 1px solid #ccc; }
    td { padding: 5px; border: 1px solid #ccc; }
    .total { text-align: right; font-weight: bold; }
    .autorizado { color: green; font-size: 16px; font-weight: bold; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h2>FACTURA ELECTRÓNICA</h2>
    <div class="autorizado">AUTORIZADO</div>
    <p><span class="label">Clave de Acceso:</span> ${invoice.claveAcceso}</p>
    <p><span class="label">N° Autorización:</span> ${sriResp?.numeroAutorizacion || 'N/A'}</p>
    <p><span class="label">Fecha Autorización:</span> ${sriResp?.fechaAutorizacion || 'N/A'}</p>
  </div>

  <div class="section">
    <p><span class="label">Razón Social Comprador:</span> ${invoice.razonSocialComprador}</p>
    <p><span class="label">Identificación:</span> ${invoice.identificacionComprador}</p>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Cantidad</th>
          <th>P. Unitario</th>
          <th>Descuento</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item) => `
        <tr>
          <td>${item.codigoPrincipal}</td>
          <td>${item.descripcion}</td>
          <td>${Number(item.cantidad).toFixed(2)}</td>
          <td>${Number(item.precioUnitario).toFixed(2)}</td>
          <td>${Number(item.descuento).toFixed(2)}</td>
          <td>${Number(item.precioTotalSinImpuesto).toFixed(2)}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="section total">
    <p>Subtotal sin IVA: $${Number(invoice.totalSinImpuestos).toFixed(2)}</p>
    <p>IVA 15%: $${Number(invoice.totalIva).toFixed(2)}</p>
    <p><strong>TOTAL: $${Number(invoice.importeTotal).toFixed(2)}</strong></p>
  </div>

  <p style="text-align:center; margin-top:20px; font-size:10px;">
    DOCUMENTO AUTORIZADO POR EL SRI - VÁLIDO COMO COMPROBANTE DE VENTA
  </p>
</body>
</html>`;
  }

  // ============================================================
  // Mock generator
  // ============================================================

  private async generateMockRide(
    invoice: InvoiceWithItems,
    sriResponse: Record<string, unknown> | undefined,
    outputPath: string,
  ): Promise<void> {
    const content = [
      '============================================================',
      '           REPRESENTACIÓN IMPRESA DE DOCUMENTO ELECTRÓNICO',
      '                     (RIDE) - MOCK DEVELOPMENT',
      '============================================================',
      '',
      `FACTURA ELECTRÓNICA`,
      `Clave de Acceso: ${invoice.claveAcceso}`,
      `N° Autorización: ${sriResponse?.numeroAutorizacion || 'N/A'}`,
      `Fecha Autorización: ${sriResponse?.fechaAutorizacion || 'N/A'}`,
      `Fecha Emisión: ${invoice.fechaEmision?.toLocaleDateString('es-EC') || 'N/A'}`,
      `Ambiente: ${invoice.ambiente}`,
      '',
      '--- COMPRADOR ---',
      `Razón Social: ${invoice.razonSocialComprador}`,
      `Identificación: ${invoice.identificacionComprador}`,
      '',
      '--- DETALLE ---',
      ...invoice.items.map(
        (item) =>
          `${item.descripcion} | Cant: ${item.cantidad} | P.Unit: ${item.precioUnitario} | Total: ${item.precioTotalSinImpuesto}`,
      ),
      '',
      '--- TOTALES ---',
      `Subtotal sin IVA: $${Number(invoice.totalSinImpuestos).toFixed(2)}`,
      `IVA 15%: $${Number(invoice.totalIva).toFixed(2)}`,
      `TOTAL: $${Number(invoice.importeTotal).toFixed(2)}`,
      '',
      'DOCUMENTO AUTORIZADO - VÁLIDO COMO COMPROBANTE DE VENTA',
      '============================================================',
    ].join('\n');

    fs.writeFileSync(outputPath, content, 'utf-8');

    // Simular tiempo de generación
    await this.sleep(100);
  }

  private ensureOutputDirExists(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      this.logger.log(`Directorio PDF creado: ${this.outputDir}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
