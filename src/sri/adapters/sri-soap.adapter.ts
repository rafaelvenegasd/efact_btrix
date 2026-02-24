import { Injectable, Logger } from '@nestjs/common';
import { SriException } from '../../common/exceptions/sri.exception';
import {
  RespuestaRecepcion,
  RespuestaAutorizacion,
  EstadoRecepcion,
  EstadoAutorizacion,
  ReceptionResult,
  AuthorizationResult,
  MensajeSri,
  TipoMensaje,
} from '../sri.types';

/**
 * SriSoapAdapter
 *
 * Adaptador para la comunicación SOAP con los web services del SRI Ecuador.
 *
 * ESTADO ACTUAL: Mock implementado. La integración SOAP real está lista
 * para conectarse descomentando el código de producción.
 *
 * Para activar la integración real:
 * 1. Instalar: npm install soap @types/soap
 * 2. Descomentar el código de producción abajo
 * 3. Comentar los métodos mock
 *
 * Web Services SRI:
 * - Recepción: validarComprobante(xml: string)
 * - Autorización: autorizacionComprobante(claveAcceso: string)
 */
@Injectable()
export class SriSoapAdapter {
  private readonly logger = new Logger(SriSoapAdapter.name);

  /**
   * Envía el XML firmado al servicio de recepción del SRI.
   *
   * @param xmlFirmado XML con firma XAdES-BES en base64
   * @param wsdlUrl URL del WSDL de recepción
   */
  async sendToReception(
    xmlFirmado: string,
    wsdlUrl: string,
  ): Promise<ReceptionResult> {
    this.logger.log(`Enviando comprobante a recepción SRI: ${wsdlUrl}`);

    // ---- IMPLEMENTACIÓN REAL (descomentar cuando esté lista) ----
    // try {
    //   const client = await soap.createClientAsync(wsdlUrl, {
    //     wsdl_options: { timeout: 30000 },
    //   });
    //
    //   // El SRI espera el XML en base64
    //   const xmlBase64 = Buffer.from(xmlFirmado, 'utf-8').toString('base64');
    //
    //   const [result] = await client.validarComprobanteAsync({
    //     xml: xmlBase64,
    //   });
    //
    //   const respuesta: RespuestaRecepcion = result.RespuestaRecepcionComprobante;
    //   return this.processReceptionResponse(respuesta);
    // } catch (error) {
    //   if (error instanceof SriException) throw error;
    //   throw SriException.connectionFailed();
    // }

    // ---- MOCK para desarrollo ----
    return this.mockSendToReception(xmlFirmado);
  }

  /**
   * Consulta el estado de autorización de un comprobante.
   *
   * @param claveAcceso Clave de acceso de 49 dígitos
   * @param wsdlUrl URL del WSDL de autorización
   */
  async checkAuthorization(
    claveAcceso: string,
    wsdlUrl: string,
  ): Promise<AuthorizationResult> {
    this.logger.log(
      `Consultando autorización SRI para clave: ${claveAcceso}`,
    );

    // ---- IMPLEMENTACIÓN REAL (descomentar cuando esté lista) ----
    // try {
    //   const client = await soap.createClientAsync(wsdlUrl, {
    //     wsdl_options: { timeout: 30000 },
    //   });
    //
    //   const [result] = await client.autorizacionComprobanteAsync({
    //     claveAccesoComprobante: claveAcceso,
    //   });
    //
    //   const respuesta: RespuestaAutorizacion = result.RespuestaAutorizacionComprobante;
    //   return this.processAuthorizationResponse(respuesta, claveAcceso);
    // } catch (error) {
    //   if (error instanceof SriException) throw error;
    //   throw SriException.connectionFailed(claveAcceso);
    // }

    // ---- MOCK para desarrollo ----
    return this.mockCheckAuthorization(claveAcceso);
  }

  // ============================================================
  // Procesadores de respuesta real del SRI
  // ============================================================

  processReceptionResponse(respuesta: RespuestaRecepcion): ReceptionResult {
    const mensajes = this.extractMensajesFromComprobante(respuesta);
    const received = respuesta.estado === EstadoRecepcion.RECIBIDA;

    if (!received) {
      const errorMessages = mensajes
        .filter((m) => m.tipo === TipoMensaje.ERROR)
        .map((m) => `[${m.identificador}] ${m.mensaje}`);

      throw SriException.receptionRejected('', errorMessages, respuesta);
    }

    return {
      received: true,
      messages: mensajes,
      rawResponse: respuesta,
    };
  }

  processAuthorizationResponse(
    respuesta: RespuestaAutorizacion,
    claveAcceso: string,
  ): AuthorizationResult {
    if (!respuesta.autorizaciones?.autorizacion) {
      return {
        status: EstadoAutorizacion.EN_PROCESO,
        messages: [],
        rawResponse: respuesta,
      };
    }

    const autorizacion = Array.isArray(respuesta.autorizaciones.autorizacion)
      ? respuesta.autorizaciones.autorizacion[0]
      : respuesta.autorizaciones.autorizacion;

    const mensajes = autorizacion.mensajes
      ? this.normalizeMensajes(autorizacion.mensajes.mensaje)
      : [];

    if (autorizacion.estado === EstadoAutorizacion.NO_AUTORIZADO) {
      const errorMessages = mensajes
        .filter((m) => m.tipo === TipoMensaje.ERROR)
        .map((m) => `[${m.identificador}] ${m.mensaje}`);

      throw SriException.authorizationRejected(
        claveAcceso,
        errorMessages,
        respuesta,
      );
    }

    return {
      status: autorizacion.estado as EstadoAutorizacion,
      numeroAutorizacion: autorizacion.numeroAutorizacion,
      fechaAutorizacion: autorizacion.fechaAutorizacion,
      messages: mensajes,
      rawResponse: respuesta,
    };
  }

  // ============================================================
  // Helpers privados
  // ============================================================

  private extractMensajesFromComprobante(
    respuesta: RespuestaRecepcion,
  ): MensajeSri[] {
    if (!respuesta.comprobantes?.comprobante) return [];

    const comprobante = Array.isArray(respuesta.comprobantes.comprobante)
      ? respuesta.comprobantes.comprobante[0]
      : respuesta.comprobantes.comprobante;

    return comprobante.mensajes
      ? this.normalizeMensajes(comprobante.mensajes as unknown)
      : [];
  }

  private normalizeMensajes(mensajes: unknown): MensajeSri[] {
    if (!mensajes) return [];
    const arr = Array.isArray(mensajes) ? mensajes : [mensajes];
    return arr as MensajeSri[];
  }

  // ============================================================
  // Mocks para desarrollo
  // ============================================================

  private async mockSendToReception(xml: string): Promise<ReceptionResult> {
    // Simular latencia de red
    await this.sleep(500);

    this.logger.warn('[MOCK] Simulando recepción SRI - RECIBIDA');

    return {
      received: true,
      messages: [
        {
          identificador: 'INFO',
          mensaje: 'Mock: Comprobante recibido correctamente',
          tipo: TipoMensaje.INFORMATIVO,
        },
      ],
      rawResponse: {
        estado: EstadoRecepcion.RECIBIDA,
        mock: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async mockCheckAuthorization(
    claveAcceso: string,
  ): Promise<AuthorizationResult> {
    // Simular latencia de consulta
    await this.sleep(800);

    const numeroAutorizacion = this.generateMockAuthNumber();
    const fechaAutorizacion = new Date().toISOString();

    this.logger.warn(
      `[MOCK] Simulando autorización SRI - AUTORIZADO: ${numeroAutorizacion}`,
    );

    return {
      status: EstadoAutorizacion.AUTORIZADO,
      numeroAutorizacion,
      fechaAutorizacion,
      messages: [],
      rawResponse: {
        claveAcceso,
        numeroAutorizacion,
        fechaAutorizacion,
        estado: EstadoAutorizacion.AUTORIZADO,
        mock: true,
      },
    };
  }

  private generateMockAuthNumber(): string {
    const now = new Date();
    const dateStr =
      `${String(now.getDate()).padStart(2, '0')}` +
      `${String(now.getMonth() + 1).padStart(2, '0')}` +
      `${now.getFullYear()}`;
    const random = String(Math.floor(Math.random() * 999999999)).padStart(9, '0');
    return `${dateStr}${random}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
