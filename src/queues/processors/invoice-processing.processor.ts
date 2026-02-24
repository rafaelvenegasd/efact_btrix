import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  InjectQueue,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InvoiceService } from '../../invoice/invoice.service';
import { SriService } from '../../sri/sri.service';
import { SigningProviderService } from '../../signing-provider/signing-provider.service';
import { PdfService } from '../../pdf/pdf.service';
import {
  QUEUE_NAMES,
  INVOICE_JOB_NAMES,
} from '../constants/queue.constants';
import { InvoiceJobData, InvoiceJobResult } from '../jobs/invoice-job.types';
import { SriException } from '../../common/exceptions/sri.exception';
import { EstadoAutorizacion } from '../../sri/sri.types';

/**
 * InvoiceProcessingProcessor
 *
 * Worker de BullMQ que ejecuta el flujo completo de emisión de una factura:
 *
 * 1. [DRAFT]       → Genera XML del comprobante
 * 2. [XML_LISTO]   → Firma con XAdES-BES (signing-provider)
 * 3. [SIGNED]      → Envía a recepción del SRI
 * 4. [SENT]        → Consulta autorización (con polling)
 * 5. [AUTHORIZED]  → Genera PDF/RIDE
 * 6. [ERROR]       → Registra error y notifica
 *
 * Este processor SOLO corre en el Worker (worker-app.module.ts),
 * NUNCA en el API server.
 */
@Processor(QUEUE_NAMES.INVOICE_PROCESSING, {
  concurrency: 3, // Máximo 3 facturas en paralelo
})
export class InvoiceProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessingProcessor.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly sriService: SriService,
    private readonly signingProviderService: SigningProviderService,
    private readonly pdfService: PdfService,
    @InjectQueue(QUEUE_NAMES.INVOICE_PROCESSING)
    private readonly queue: Queue,
  ) {
    super();
  }

  /**
   * Punto de entrada del processor. BullMQ llama a este método por cada job.
   */
  async process(job: Job<InvoiceJobData>): Promise<InvoiceJobResult> {
    const startTime = Date.now();
    const { invoiceId, dealId, ambiente } = job.data;

    this.logger.log(
      `[Job ${job.id}] Procesando factura: ${invoiceId} | Deal: ${dealId} | Intento: ${job.attemptsMade + 1}`,
    );

    try {
      switch (job.name) {
        case INVOICE_JOB_NAMES.PROCESS:
          return await this.handleProcessInvoice(job, startTime);

        default:
          throw new Error(`Job desconocido: ${job.name}`);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[Job ${job.id}] Error procesando factura ${invoiceId}: ${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Si no hay más reintentos, marcar como ERROR en BD
      const maxAttempts = job.opts.attempts || 3;
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.invoiceService.markAsError(invoiceId, errorMsg);
      }

      // Re-lanzar para que BullMQ registre el job como fallido y reintente
      throw error;
    }
  }

  // ============================================================
  // Flujo principal de procesamiento
  // ============================================================

  private async handleProcessInvoice(
    job: Job<InvoiceJobData>,
    startTime: number,
  ): Promise<InvoiceJobResult> {
    const { invoiceId, ambiente } = job.data;

    // ---- Paso 1: Generar XML ----
    await job.updateProgress(10);
    this.logger.log(`[Job ${job.id}] Paso 1/5: Generando XML...`);

    const { xml, claveAcceso, secuencial, fechaEmision } =
      await this.invoiceService.generateXml(invoiceId);

    this.logger.log(
      `[Job ${job.id}] XML generado. Clave: ${claveAcceso} | Secuencial: ${secuencial}`,
    );

    // ---- Paso 2: Firmar XML ----
    await job.updateProgress(25);
    this.logger.log(`[Job ${job.id}] Paso 2/5: Firmando XML con XAdES-BES...`);

    const xmlFirmado = await this.signingProviderService.sign(xml);
    await this.invoiceService.updateXmlFirmado(invoiceId, xmlFirmado);

    this.logger.log(`[Job ${job.id}] XML firmado`);

    // ---- Paso 3: Enviar a recepción SRI ----
    await job.updateProgress(45);
    this.logger.log(
      `[Job ${job.id}] Paso 3/5: Enviando a recepción SRI [${ambiente}]...`,
    );

    const receptionResult = await this.sriService.sendToReception(
      xmlFirmado,
      ambiente,
    );

    if (!receptionResult.received) {
      throw new Error('SRI rechazó el comprobante en recepción');
    }

    await this.invoiceService.markAsSent(invoiceId);
    this.logger.log(
      `[Job ${job.id}] Comprobante recibido por SRI: ${claveAcceso}`,
    );

    // ---- Paso 4: Consultar autorización ----
    await job.updateProgress(60);
    this.logger.log(
      `[Job ${job.id}] Paso 4/5: Consultando autorización SRI...`,
    );

    const authResult = await this.sriService.checkAuthorizationWithRetry(
      claveAcceso,
      ambiente,
    );

    if (authResult.status !== EstadoAutorizacion.AUTORIZADO) {
      throw new Error(`Estado inesperado de autorización: ${authResult.status}`);
    }

    await this.invoiceService.markAsAuthorized(invoiceId, {
      ...(authResult.rawResponse as Record<string, unknown>),
      numeroAutorizacion: authResult.numeroAutorizacion,
      fechaAutorizacion: authResult.fechaAutorizacion,
    });

    this.logger.log(
      `[Job ${job.id}] Factura AUTORIZADA. N°: ${authResult.numeroAutorizacion}`,
    );

    // ---- Paso 5: Generar PDF/RIDE ----
    await job.updateProgress(85);
    this.logger.log(`[Job ${job.id}] Paso 5/5: Generando PDF/RIDE...`);

    const invoiceWithItems =
      await this.invoiceService.findByIdWithItems(invoiceId);

    if (invoiceWithItems) {
      try {
        const pdfPath = await this.pdfService.generateRide(invoiceWithItems, {
          numeroAutorizacion: authResult.numeroAutorizacion,
          fechaAutorizacion: authResult.fechaAutorizacion,
        });
        await this.invoiceService.updatePdfPath(invoiceId, pdfPath);
        this.logger.log(`[Job ${job.id}] RIDE generado: ${pdfPath}`);
      } catch (pdfError) {
        // No fallar el job si el PDF falla - la factura ya está autorizada
        this.logger.error(
          `[Job ${job.id}] Error generando PDF (factura ya autorizada): ${pdfError}`,
        );
      }
    }

    await job.updateProgress(100);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `[Job ${job.id}] Factura ${invoiceId} procesada exitosamente en ${durationMs}ms`,
    );

    return {
      invoiceId,
      claveAcceso,
      estado: 'AUTHORIZED',
      processedAt: new Date().toISOString(),
      durationMs,
    };
  }

  // ============================================================
  // Eventos del worker
  // ============================================================

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.debug(
      `[Worker] Job activo: ${job.id} | ${job.name} | Intento: ${job.attemptsMade + 1}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: InvoiceJobResult): void {
    this.logger.log(
      `[Worker] Job completado: ${job.id} | Factura: ${result.invoiceId} | ${result.durationMs}ms`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `[Worker] Job fallido: ${job?.id} | Error: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(
      `[Worker] Job stalled (posible crash): ${jobId}`,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number | object): void {
    this.logger.debug(`[Worker] Job ${job.id} progreso: ${progress}%`);
  }
}
