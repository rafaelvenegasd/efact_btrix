import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ambiente } from '@prisma/client';
import { SriSoapAdapter } from './adapters/sri-soap.adapter';
import {
  ReceptionResult,
  AuthorizationResult,
  EstadoAutorizacion,
  SriUrls,
} from './sri.types';
import { SriException, SriErrorCode } from '../common/exceptions/sri.exception';

/**
 * SriService
 *
 * Servicio principal de integración con el SRI Ecuador.
 * Selecciona las URLs correctas según el ambiente (TEST/PROD)
 * y coordina los intentos de autorización con polling.
 */
@Injectable()
export class SriService {
  private readonly logger = new Logger(SriService.name);

  constructor(
    private readonly sriSoapAdapter: SriSoapAdapter,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía el comprobante firmado al servicio de recepción del SRI.
   * El SRI valida la estructura y la firma del comprobante.
   */
  async sendToReception(
    xmlFirmado: string,
    ambiente: Ambiente,
  ): Promise<ReceptionResult> {
    const urls = this.getUrlsForAmbiente(ambiente);

    this.logger.log(
      `Enviando a recepción SRI [${ambiente}]: ${urls.recepcion}`,
    );

    try {
      return await this.sriSoapAdapter.sendToReception(
        xmlFirmado,
        urls.recepcion,
      );
    } catch (error) {
      if (error instanceof SriException) throw error;

      this.logger.error('Error inesperado enviando a SRI recepción', error);
      throw new SriException(
        {
          code: SriErrorCode.UNEXPECTED_ERROR,
        },
        `Error inesperado: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Consulta la autorización de un comprobante con reintentos.
   *
   * El SRI puede tardar hasta varios minutos en autorizar.
   * Se realizan reintentos con intervalo configurable.
   */
  async checkAuthorizationWithRetry(
    claveAcceso: string,
    ambiente: Ambiente,
  ): Promise<AuthorizationResult> {
    const urls = this.getUrlsForAmbiente(ambiente);
    const maxRetries = this.configService.get<number>('sri.maxRetries', 12);
    const pollIntervalMs = this.configService.get<number>(
      'sri.pollIntervalMs',
      5000,
    );

    this.logger.log(
      `Consultando autorización SRI [${ambiente}] para: ${claveAcceso}`,
    );
    this.logger.debug(
      `Configuración: ${maxRetries} reintentos, ${pollIntervalMs}ms intervalo`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.debug(
        `Intento ${attempt}/${maxRetries} para clave: ${claveAcceso}`,
      );

      const result = await this.sriSoapAdapter.checkAuthorization(
        claveAcceso,
        urls.autorizacion,
      );

      if (result.status === EstadoAutorizacion.AUTORIZADO) {
        this.logger.log(
          `Factura AUTORIZADA. Num: ${result.numeroAutorizacion} | Clave: ${claveAcceso}`,
        );
        return result;
      }

      if (result.status === EstadoAutorizacion.NO_AUTORIZADO) {
        // SriSoapAdapter ya lanzó SriException.authorizationRejected
        // Este código no debería alcanzarse
        throw SriException.authorizationRejected(claveAcceso, [
          'Estado NO AUTORIZADO',
        ]);
      }

      // Estado EN_PROCESO - esperar y reintentar
      if (attempt < maxRetries) {
        this.logger.debug(
          `En proceso... esperando ${pollIntervalMs}ms (intento ${attempt}/${maxRetries})`,
        );
        await this.sleep(pollIntervalMs);
      }
    }

    // Se agotaron los reintentos
    throw SriException.authorizationTimeout(claveAcceso);
  }

  /**
   * Consulta única de autorización (sin reintentos).
   * Útil para verificaciones manuales o webhooks SRI (futuros).
   */
  async checkAuthorization(
    claveAcceso: string,
    ambiente: Ambiente,
  ): Promise<AuthorizationResult> {
    const urls = this.getUrlsForAmbiente(ambiente);
    return this.sriSoapAdapter.checkAuthorization(
      claveAcceso,
      urls.autorizacion,
    );
  }

  /**
   * Obtiene las URLs según el ambiente activo.
   */
  getUrlsForAmbiente(ambiente: Ambiente): SriUrls {
    const env = ambiente === Ambiente.PROD ? 'prod' : 'test';

    return {
      recepcion: this.configService.get<string>(`sri.recepcion.${env}`) || '',
      autorizacion:
        this.configService.get<string>(`sri.autorizacion.${env}`) || '',
    };
  }

  /**
   * Retorna el ambiente activo configurado en .env
   */
  getAmbienteActivo(): Ambiente {
    const sriEnv = this.configService.get<string>('sri.env', 'TEST');
    return sriEnv === 'PROD' ? Ambiente.PROD : Ambiente.TEST;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
