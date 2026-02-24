import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockSignerService } from './mock/mock-signer.service';

/**
 * SigningProviderService
 *
 * Servicio central de firma digital de comprobantes electrónicos.
 *
 * Actúa como fachada (Facade Pattern) que delega a la implementación
 * de firma apropiada:
 * - En desarrollo/testing: MockSignerService
 * - En producción: RealSignerService (a implementar con certificado .p12)
 *
 * La firma XAdES-BES es requerida por el SRI Ecuador para todos los
 * comprobantes electrónicos.
 *
 * IMPLEMENTACIÓN REAL:
 * Para producción, implementar un RealSignerService que use:
 * - node-forge: para leer el certificado .p12
 * - xmldsigjs o similar: para generar la firma XAdES-BES
 *
 * Alternativamente, conectar a un microservicio externo de firma
 * (ej: firma-electronica-ec, bce-firma, etc.)
 */
@Injectable()
export class SigningProviderService {
  private readonly logger = new Logger(SigningProviderService.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly mockSigner: MockSignerService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction =
      configService.get<string>('app.nodeEnv') === 'production';
  }

  /**
   * Firma el XML con XAdES-BES usando el certificado configurado.
   *
   * @param xml XML sin firma del comprobante
   * @returns XML con firma digital embebida
   */
  async sign(xml: string): Promise<string> {
    this.logger.log(
      `Iniciando firma de comprobante (${this.isProduction ? 'PRODUCCION' : 'MOCK'})`,
    );

    if (this.isProduction) {
      // TODO: Instanciar RealSignerService cuando esté implementado
      // return this.realSigner.sign(xml);
      this.logger.warn(
        'ATENCIÓN: Modo producción activado pero firma real no implementada. Usando mock.',
      );
    }

    const signedXml = await this.mockSigner.sign(xml);
    this.logger.log('Comprobante firmado exitosamente');
    return signedXml;
  }

  /**
   * Verifica si el certificado configurado es válido y no ha expirado.
   * Útil para health checks y validaciones preventivas.
   */
  async validateCertificate(): Promise<{
    valid: boolean;
    expiresAt?: Date;
    subject?: string;
    message: string;
  }> {
    if (!this.isProduction) {
      return {
        valid: true,
        message: 'Mock certificate - siempre válido en desarrollo',
      };
    }

    // TODO: Implementar validación real del certificado .p12
    // const certPath = this.configService.get('signing.certPath');
    // const certPassword = this.configService.get('signing.certPassword');
    // ...validar con node-forge...

    return {
      valid: false,
      message: 'Validación de certificado real no implementada',
    };
  }
}
