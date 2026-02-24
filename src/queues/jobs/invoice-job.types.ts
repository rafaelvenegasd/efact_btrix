import { Ambiente } from '@prisma/client';

/**
 * Datos que se pasan en el job de procesamiento de factura.
 *
 * Se mantiene mínimo y con identificadores, no datos completos.
 * Los datos completos se obtienen de la BD en el processor.
 */
export interface InvoiceJobData {
  /** ID de la factura en nuestra BD */
  invoiceId: string;

  /** Deal ID de Bitrix24 (para logging y trazabilidad) */
  dealId: string;

  /** Ambiente en que se procesa */
  ambiente: Ambiente;

  /** Timestamp del encolamiento */
  enqueuedAt: string;
}

/**
 * Resultado del job de procesamiento
 */
export interface InvoiceJobResult {
  invoiceId: string;
  claveAcceso?: string;
  estado: string;
  processedAt: string;
  durationMs: number;
}
