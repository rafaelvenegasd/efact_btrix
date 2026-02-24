import { HttpException, HttpStatus } from '@nestjs/common';

export enum SriErrorCode {
  SOAP_CONNECTION_FAILED = 'SRI_SOAP_CONNECTION_FAILED',
  RECEPTION_REJECTED = 'SRI_RECEPTION_REJECTED',
  AUTHORIZATION_TIMEOUT = 'SRI_AUTHORIZATION_TIMEOUT',
  AUTHORIZATION_REJECTED = 'SRI_AUTHORIZATION_REJECTED',
  INVALID_RESPONSE = 'SRI_INVALID_RESPONSE',
  UNEXPECTED_ERROR = 'SRI_UNEXPECTED_ERROR',
}

export interface SriErrorDetails {
  code: SriErrorCode;
  claveAcceso?: string;
  sriMessages?: string[];
  rawResponse?: unknown;
}

export class SriException extends HttpException {
  public readonly details: SriErrorDetails;

  constructor(details: SriErrorDetails, message?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        error: 'SRI Error',
        message: message || `Error comunicándose con el SRI: ${details.code}`,
        details,
      },
      HttpStatus.BAD_GATEWAY,
    );
    this.details = details;
  }

  static connectionFailed(claveAcceso?: string): SriException {
    return new SriException(
      {
        code: SriErrorCode.SOAP_CONNECTION_FAILED,
        claveAcceso,
      },
      'No se pudo conectar al servicio SOAP del SRI',
    );
  }

  static receptionRejected(
    claveAcceso: string,
    sriMessages: string[],
    rawResponse?: unknown,
  ): SriException {
    return new SriException(
      {
        code: SriErrorCode.RECEPTION_REJECTED,
        claveAcceso,
        sriMessages,
        rawResponse,
      },
      `Comprobante devuelto por SRI: ${sriMessages.join(', ')}`,
    );
  }

  static authorizationTimeout(claveAcceso: string): SriException {
    return new SriException(
      {
        code: SriErrorCode.AUTHORIZATION_TIMEOUT,
        claveAcceso,
      },
      `Timeout esperando autorización SRI para clave: ${claveAcceso}`,
    );
  }

  static authorizationRejected(
    claveAcceso: string,
    sriMessages: string[],
    rawResponse?: unknown,
  ): SriException {
    return new SriException(
      {
        code: SriErrorCode.AUTHORIZATION_REJECTED,
        claveAcceso,
        sriMessages,
        rawResponse,
      },
      `Comprobante RECHAZADO por SRI: ${sriMessages.join(', ')}`,
    );
  }
}
