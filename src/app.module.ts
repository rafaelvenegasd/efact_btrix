import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BitrixModule } from './bitrix/bitrix.module';
import { InvoiceModule } from './invoice/invoice.module';
import { SriModule } from './sri/sri.module';
import { SigningProviderModule } from './signing-provider/signing-provider.module';
import { PdfModule } from './pdf/pdf.module';
import { QueuesModule } from './queues/queues.module';

/**
 * Módulo principal del servidor HTTP (API).
 *
 * Incluye todos los módulos necesarios para atender requests HTTP.
 * El procesamiento asíncrono ocurre en el Worker (worker-app.module.ts).
 */
@Module({
  imports: [
    // Configuración global - disponible en toda la app sin re-importar
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Infraestructura
    PrismaModule,

    // Colas (API solo necesita el Producer para encolar trabajos)
    QueuesModule,

    // Módulos de negocio HTTP
    AuthModule,
    BitrixModule,
    InvoiceModule,

    // Adaptadores externos (disponibles para inyección)
    SriModule,
    SigningProviderModule,
    PdfModule,
  ],
})
export class AppModule {}
