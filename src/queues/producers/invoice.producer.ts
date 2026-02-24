import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InvoiceService } from '../../invoice/invoice.service';
import { QUEUE_NAMES, INVOICE_JOB_NAMES, JOB_DEFAULT_OPTIONS } from '../constants/queue.constants';
import { InvoiceJobData } from '../jobs/invoice-job.types';
import { Ambiente } from '@prisma/client';

/**
 * InvoiceProducer
 *
 * Responsable de encolar jobs de procesamiento de facturas.
 * Usado por el API server (nunca por el worker).
 */
@Injectable()
export class InvoiceProducer {
  private readonly logger = new Logger(InvoiceProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.INVOICE_PROCESSING)
    private readonly invoiceQueue: Queue,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Encola el procesamiento completo de una factura.
   *
   * @param invoiceId ID de la factura en la BD
   */
  async enqueueInvoiceProcessing(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceService.findById(invoiceId);

    if (!invoice) {
      this.logger.error(`Factura no encontrada al encolar: ${invoiceId}`);
      throw new Error(`Factura no encontrada: ${invoiceId}`);
    }

    const jobData: InvoiceJobData = {
      invoiceId,
      dealId: invoice.dealId,
      ambiente: invoice.ambiente,
      enqueuedAt: new Date().toISOString(),
    };

    const job = await this.invoiceQueue.add(
      INVOICE_JOB_NAMES.PROCESS,
      jobData,
      {
        ...JOB_DEFAULT_OPTIONS,
        jobId: `invoice-${invoiceId}`, // Garantiza idempotencia
      },
    );

    this.logger.log(
      `Job encolado: ${job.id} | Factura: ${invoiceId} | Deal: ${invoice.dealId}`,
    );
  }

  /**
   * Obtiene métricas de la cola para monitoreo.
   */
  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.invoiceQueue.getWaitingCount(),
      this.invoiceQueue.getActiveCount(),
      this.invoiceQueue.getCompletedCount(),
      this.invoiceQueue.getFailedCount(),
      this.invoiceQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Reintenta manualmente un job fallido.
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.invoiceQueue.getJob(jobId);
    if (!job) throw new Error(`Job no encontrado: ${jobId}`);
    await job.retry();
    this.logger.log(`Job ${jobId} reencolado para reintento`);
  }
}
