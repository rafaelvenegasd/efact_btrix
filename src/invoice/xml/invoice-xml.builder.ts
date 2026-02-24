import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { InvoiceXmlData, SRI_CONSTANTS } from '../types/invoice.types';
import { InvoiceException } from '../../common/exceptions/invoice.exception';

/**
 * InvoiceXmlBuilder
 *
 * Genera el XML de factura electrónica según la especificación del SRI Ecuador.
 * Formato: Factura Versión 1.0.0
 *
 * Referencia: Ficha Técnica Comprobantes Electrónicos v2.21
 */
@Injectable()
export class InvoiceXmlBuilder {
  private readonly logger = new Logger(InvoiceXmlBuilder.name);

  /**
   * Genera el XML de la factura sin firma.
   * El XML resultante debe ser firmado con XAdES-BES antes de enviarse al SRI.
   */
  buildFacturaXml(data: InvoiceXmlData): string {
    try {
      const ambienteCodigo = SRI_CONSTANTS.AMBIENTE[data.ambiente];
      const fechaEmisionStr = this.formatFechaEmision(data.fechaEmision);

      const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('factura', {
          id: 'comprobante',
          version: '1.0.0',
        });

      // ---- infoTributaria ----
      const infoTributaria = root.ele('infoTributaria');
      infoTributaria.ele('ambiente').txt(ambienteCodigo);
      infoTributaria.ele('tipoEmision').txt(SRI_CONSTANTS.TIPO_EMISION_NORMAL);
      infoTributaria.ele('razonSocial').txt(data.company.razonSocial);
      infoTributaria.ele('nombreComercial').txt(data.company.nombreComercial);
      infoTributaria.ele('ruc').txt(data.company.ruc);
      infoTributaria.ele('claveAcceso').txt(data.claveAcceso);
      infoTributaria.ele('codDoc').txt(SRI_CONSTANTS.TIPO_COMPROBANTE_FACTURA);
      infoTributaria.ele('estab').txt(data.company.establecimiento.padStart(3, '0'));
      infoTributaria.ele('ptoEmi').txt(data.company.puntoEmision.padStart(3, '0'));
      infoTributaria.ele('secuencial').txt(data.secuencial.padStart(9, '0'));
      infoTributaria.ele('dirMatriz').txt(data.company.dirMatriz);

      // ---- infoFactura ----
      const infoFactura = root.ele('infoFactura');
      infoFactura.ele('fechaEmision').txt(fechaEmisionStr);
      infoFactura.ele('dirEstablecimiento').txt(data.company.dirEstablecimiento);

      if (data.company.contribuyenteEspecial) {
        infoFactura
          .ele('contribuyenteEspecial')
          .txt(data.company.contribuyenteEspecial);
      }

      infoFactura
        .ele('obligadoContabilidad')
        .txt(data.company.obligadoContabilidad);
      infoFactura
        .ele('tipoIdentificacionComprador')
        .txt(data.tipoIdentificacionComprador);
      infoFactura
        .ele('razonSocialComprador')
        .txt(data.razonSocialComprador);
      infoFactura
        .ele('identificacionComprador')
        .txt(data.identificacionComprador);
      infoFactura.ele('totalSinImpuestos').txt(
        data.totalSinImpuestos.toFixed(2),
      );
      infoFactura.ele('totalDescuento').txt(data.totalDescuento.toFixed(2));

      // Totales con impuestos
      const totalConImpuestos = infoFactura.ele('totalConImpuestos');
      const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
      totalImpuesto.ele('codigo').txt(SRI_CONSTANTS.IVA.CODIGO);
      totalImpuesto.ele('codigoPorcentaje').txt(SRI_CONSTANTS.IVA.CODIGO_PORCENTAJE_15);
      totalImpuesto
        .ele('baseImponible')
        .txt(data.totalSinImpuestos.toFixed(2));
      totalImpuesto.ele('valor').txt(data.totalIva.toFixed(2));

      infoFactura.ele('propina').txt('0.00');
      infoFactura.ele('importeTotal').txt(data.importeTotal.toFixed(2));
      infoFactura.ele('moneda').txt(SRI_CONSTANTS.MONEDA);

      // Pagos (requerido en versión 1.0.0)
      const pagos = infoFactura.ele('pagos');
      const pago = pagos.ele('pago');
      pago.ele('formaPago').txt('01'); // 01 = Sin utilización del sistema financiero
      pago.ele('total').txt(data.importeTotal.toFixed(2));
      pago.ele('plazo').txt('0');
      pago.ele('unidadTiempo').txt('dias');

      // ---- detalles ----
      const detalles = root.ele('detalles');

      for (const item of data.items) {
        const detalle = detalles.ele('detalle');
        detalle.ele('codigoPrincipal').txt(item.codigoPrincipal);

        if (item.codigoAuxiliar) {
          detalle.ele('codigoAuxiliar').txt(item.codigoAuxiliar);
        }

        detalle.ele('descripcion').txt(item.descripcion);
        detalle.ele('cantidad').txt(item.cantidad.toFixed(4));
        detalle.ele('precioUnitario').txt(item.precioUnitario.toFixed(4));
        detalle.ele('descuento').txt(item.descuento.toFixed(2));
        detalle
          .ele('precioTotalSinImpuesto')
          .txt(item.precioTotalSinImpuesto.toFixed(2));

        const impuestos = detalle.ele('impuestos');
        const impuesto = impuestos.ele('impuesto');
        impuesto.ele('codigo').txt(SRI_CONSTANTS.IVA.CODIGO);
        impuesto.ele('codigoPorcentaje').txt(SRI_CONSTANTS.IVA.CODIGO_PORCENTAJE_15);
        impuesto.ele('tarifa').txt(item.ivaTarifa.toFixed(2));
        impuesto.ele('baseImponible').txt(item.ivaBase.toFixed(2));
        impuesto.ele('valor').txt(item.ivaValor.toFixed(2));
      }

      // ---- infoAdicional ----
      if (data.emailComprador) {
        const infoAdicional = root.ele('infoAdicional');
        infoAdicional
          .ele('campoAdicional', { nombre: 'email' })
          .txt(data.emailComprador);
      }

      const xml = root.end({ prettyPrint: false });

      this.logger.debug(
        `XML generado para claveAcceso: ${data.claveAcceso}`,
      );

      return xml;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw InvoiceException.xmlGenerationFailed(msg);
    }
  }

  /**
   * Calcula los totales de los items.
   * IVA 15% para Ecuador (vigente desde mayo 2024).
   */
  calculateTotals(
    items: Array<{
      cantidad: number;
      precioUnitario: number;
      descuento?: number;
    }>,
  ): {
    totalSinImpuestos: number;
    totalDescuento: number;
    totalIva: number;
    importeTotal: number;
    processedItems: Array<{
      precioTotalSinImpuesto: number;
      descuento: number;
      ivaBase: number;
      ivaValor: number;
      ivaTarifa: number;
    }>;
  } {
    let totalSinImpuestos = 0;
    let totalDescuento = 0;
    const processedItems: Array<{
      precioTotalSinImpuesto: number;
      descuento: number;
      ivaBase: number;
      ivaValor: number;
      ivaTarifa: number;
    }> = [];

    for (const item of items) {
      const descuento = item.descuento || 0;
      const subtotal = this.round2(item.cantidad * item.precioUnitario);
      const precioTotalSinImpuesto = this.round2(subtotal - descuento);
      const ivaBase = precioTotalSinImpuesto;
      const ivaValor = this.round2(ivaBase * (SRI_CONSTANTS.IVA.TARIFA_15 / 100));

      totalSinImpuestos = this.round2(totalSinImpuestos + precioTotalSinImpuesto);
      totalDescuento = this.round2(totalDescuento + descuento);

      processedItems.push({
        precioTotalSinImpuesto,
        descuento,
        ivaBase,
        ivaValor,
        ivaTarifa: SRI_CONSTANTS.IVA.TARIFA_15,
      });
    }

    const totalIva = this.round2(
      processedItems.reduce((acc, i) => acc + i.ivaValor, 0),
    );
    const importeTotal = this.round2(totalSinImpuestos + totalIva);

    return {
      totalSinImpuestos,
      totalDescuento,
      totalIva,
      importeTotal,
      processedItems,
    };
  }

  private formatFechaEmision(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
