/**
 * Worker Entry Point
 *
 * Este proceso corre INDEPENDIENTE del API server.
 * Solo inicializa los módulos necesarios para procesar colas BullMQ.
 * No levanta ningún servidor HTTP.
 *
 * Ejecutar en desarrollo:
 *   npm run start:worker:dev
 *
 * Ejecutar en producción:
 *   node dist/worker
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerAppModule } from './worker-app.module';

async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('WorkerBootstrap');

  // ApplicationContext en lugar de HTTP app - sin servidor HTTP
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    bufferLogs: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM recibido. Cerrando worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT recibido. Cerrando worker...');
    await app.close();
    process.exit(0);
  });

  logger.log('Worker de facturación iniciado y escuchando colas BullMQ');
  logger.log(`SRI Ambiente: ${process.env.SRI_ENV || 'TEST'}`);
}

bootstrapWorker().catch((err) => {
  console.error('Error fatal al iniciar Worker:', err);
  process.exit(1);
});
