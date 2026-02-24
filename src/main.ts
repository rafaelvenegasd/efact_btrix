import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const prefix = configService.get<string>('app.prefix', 'api/v1');

  // Prefijo global
  app.setGlobalPrefix(prefix);

  // Versionado de API (preparado para futuras versiones)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip propiedades no decoradas
      forbidNonWhitelisted: true,
      transform: true,          // Auto-transform payloads a tipos TS
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptor de logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS - Configurar según necesidades en producción
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port);
  logger.log(`API Server corriendo en: http://localhost:${port}/${prefix}`);
  logger.log(`Ambiente: ${configService.get('app.nodeEnv')}`);
  logger.log(`SRI Ambiente: ${configService.get('sri.env')}`);
}

bootstrap().catch((err) => {
  console.error('Error fatal al iniciar API Server:', err);
  process.exit(1);
});
