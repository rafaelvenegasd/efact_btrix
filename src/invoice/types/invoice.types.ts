import { Ambiente, InvoiceEstado, TipoIdentificacion } from '@prisma/client';

// ============================================================
// Tipos para crear una factura
// ============================================================

export interface CreateInvoiceDraftInput {
  dealId: string;
  ambiente: Ambiente;
  comprador?: {
    tipoIdentificacion?: string;
    razonSocial: string;
    identificacion: string;
    email?: string;
    telefono?: string;
  };
  items?: Array<{
    codigoPrincipal: string;
    codigoAuxiliar?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
  }>;
}

// ============================================================
// Datos de empresa para generación XML
// ============================================================

export interface CompanyData {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  dirMatriz: string;
  dirEstablecimiento: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: string;
  establecimiento: string;
  puntoEmision: string;
}

// ============================================================
// Datos completos para generación XML
// ============================================================

export interface InvoiceXmlData {
  // Emisor
  company: CompanyData;

  // Identificadores
  ambiente: Ambiente;
  secuencial: string;
  claveAcceso: string;
  fechaEmision: Date;

  // Comprador
  tipoIdentificacionComprador: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  emailComprador?: string;

  // Items
  items: InvoiceXmlItem[];

  // Totales (calculados)
  totalSinImpuestos: number;
  totalDescuento: number;
  totalIva: number;
  importeTotal: number;
}

export interface InvoiceXmlItem {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  ivaBase: number;
  ivaValor: number;
  ivaTarifa: number;
}

// ============================================================
// Constantes SRI Ecuador
// ============================================================

export const SRI_CONSTANTS = {
  TIPO_COMPROBANTE_FACTURA: '01',
  TIPO_EMISION_NORMAL: '1',
  MONEDA: 'DOLAR',

  IVA: {
    CODIGO: '2',
    CODIGO_PORCENTAJE_15: '4',  // IVA 15% (vigente desde 2024)
    TARIFA_15: 15.00,
    CODIGO_PORCENTAJE_0: '0',   // IVA 0%
    TARIFA_0: 0.00,
    CODIGO_PORCENTAJE_EXENTO: '6', // Exento de IVA
  },

  AMBIENTE: {
    TEST: '1',
    PROD: '2',
  },

  TIPO_IDENTIFICACION: {
    RUC: '04',
    CEDULA: '05',
    PASAPORTE: '06',
    CONSUMIDOR_FINAL: '07',
  },
} as const;

// ============================================================
// Estado de respuesta SRI
// ============================================================

export interface SriReceptionResponse {
  estado: 'RECIBIDA' | 'DEVUELTA';
  comprobantes?: {
    comprobante: {
      claveAcceso: string;
      mensajes?: Array<{
        identificador: string;
        mensaje: string;
        informacionAdicional?: string;
        tipo: 'ERROR' | 'ADVERTENCIA';
      }>;
    };
  };
}

export interface SriAuthorizationResponse {
  numeroComprobantes: string;
  autorizaciones?: {
    autorizacion: {
      estado: 'AUTORIZADO' | 'NO AUTORIZADO' | 'EN PROCESO';
      numeroAutorizacion?: string;
      fechaAutorizacion?: string;
      ambiente: string;
      comprobante?: string; // XML del comprobante autorizado
      mensajes?: Array<{
        identificador: string;
        mensaje: string;
        informacionAdicional?: string;
        tipo: string;
      }>;
    };
  };
}

export type InvoiceWithItems = {
  id: string;
  dealId: string;
  secuencial: string | null;
  claveAcceso: string | null;
  estado: InvoiceEstado;
  ambiente: Ambiente;
  tipoIdentificacionComprador: TipoIdentificacion | null;
  razonSocialComprador: string | null;
  identificacionComprador: string | null;
  emailComprador: string | null;
  fechaEmision: Date | null;
  totalSinImpuestos: any;
  totalIva: any;
  importeTotal: any;
  sriResponse: any;
  xmlGenerado: string | null;
  xmlFirmado: string | null;
  pdfPath: string | null;
  items: Array<{
    id: string;
    codigoPrincipal: string;
    codigoAuxiliar: string | null;
    descripcion: string;
    cantidad: any;
    precioUnitario: any;
    descuento: any;
    precioTotalSinImpuesto: any;
    ivaBaseImponible: any;
    ivaValor: any;
    ivaTarifa: any;
  }>;
};
