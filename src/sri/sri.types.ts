/**
 * Tipos para la integración con el SRI Ecuador.
 * Basados en la especificación de Comprobantes Electrónicos v2.21
 */

// ============================================================
// Recepción
// ============================================================

export enum EstadoRecepcion {
  RECIBIDA = 'RECIBIDA',
  DEVUELTA = 'DEVUELTA',
}

export enum TipoMensaje {
  ERROR = 'ERROR',
  ADVERTENCIA = 'ADVERTENCIA',
  INFORMATIVO = 'INFORMATIVO',
}

export interface MensajeSri {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: TipoMensaje;
}

export interface ComprobanteRecepcion {
  claveAcceso: string;
  mensajes?: MensajeSri[];
}

export interface RespuestaRecepcion {
  estado: EstadoRecepcion;
  comprobantes?: {
    comprobante: ComprobanteRecepcion | ComprobanteRecepcion[];
  };
}

// ============================================================
// Autorización
// ============================================================

export enum EstadoAutorizacion {
  AUTORIZADO = 'AUTORIZADO',
  NO_AUTORIZADO = 'NO AUTORIZADO',
  EN_PROCESO = 'EN PROCESO',
}

export interface AutorizacionSri {
  estado: EstadoAutorizacion;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente: string;
  comprobante?: string; // XML del comprobante autorizado
  mensajes?: {
    mensaje: MensajeSri | MensajeSri[];
  };
}

export interface RespuestaAutorizacion {
  numeroComprobantes: string;
  autorizaciones?: {
    autorizacion: AutorizacionSri | AutorizacionSri[];
  };
}

// ============================================================
// Resultado interno del servicio
// ============================================================

export interface ReceptionResult {
  received: boolean;
  messages: MensajeSri[];
  rawResponse: unknown;
}

export interface AuthorizationResult {
  status: EstadoAutorizacion;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  messages: MensajeSri[];
  rawResponse: unknown;
}

// ============================================================
// URLs SOAP del SRI
// ============================================================

export interface SriUrls {
  recepcion: string;
  autorizacion: string;
}
