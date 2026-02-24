/**
 * Nombres de las colas BullMQ.
 * Centralizado para evitar strings mágicos.
 */
export const QUEUE_NAMES = {
  INVOICE_PROCESSING: 'invoice-processing',
} as const;

/**
 * Nombres de los jobs dentro de la cola invoice-processing.
 */
export const INVOICE_JOB_NAMES = {
  PROCESS: 'process-invoice',
} as const;

/**
 * Configuración por defecto de los jobs.
 */
export const JOB_DEFAULT_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5s, 25s, 125s
  },
  removeOnComplete: {
    age: 24 * 3600, // Mantener jobs completados 24h
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Mantener jobs fallidos 7 días para auditoría
  },
} as const;
