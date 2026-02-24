import { Module } from '@nestjs/common';
import { SigningProviderService } from './signing-provider.service';
import { MockSignerService } from './mock/mock-signer.service';

/**
 * SigningProviderModule
 *
 * Módulo de firma digital de comprobantes electrónicos.
 *
 * Para integrar una firma real en producción:
 * 1. Crear RealSignerService en ./real/real-signer.service.ts
 * 2. Agregar al providers array
 * 3. Inyectar condicionalmente en SigningProviderService
 *    según NODE_ENV o una variable SIGNING_PROVIDER=mock|real
 */
@Module({
  providers: [SigningProviderService, MockSignerService],
  exports: [SigningProviderService],
})
export class SigningProviderModule {}
