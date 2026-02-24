import { HttpException, HttpStatus } from '@nestjs/common';

export enum SigningErrorCode {
  CERT_NOT_FOUND = 'SIGNING_CERT_NOT_FOUND',
  CERT_INVALID = 'SIGNING_CERT_INVALID',
  CERT_EXPIRED = 'SIGNING_CERT_EXPIRED',
  SIGNING_FAILED = 'SIGNING_FAILED',
  XML_INVALID = 'SIGNING_XML_INVALID',
}

export class SigningException extends HttpException {
  public readonly code: SigningErrorCode;

  constructor(code: SigningErrorCode, message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Signing Error',
        message,
        code,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.code = code;
  }

  static certNotFound(path: string): SigningException {
    return new SigningException(
      SigningErrorCode.CERT_NOT_FOUND,
      `Certificado no encontrado en: ${path}`,
    );
  }

  static certInvalid(reason: string): SigningException {
    return new SigningException(
      SigningErrorCode.CERT_INVALID,
      `Certificado inválido: ${reason}`,
    );
  }

  static certExpired(validUntil: string): SigningException {
    return new SigningException(
      SigningErrorCode.CERT_EXPIRED,
      `Certificado vencido desde: ${validUntil}`,
    );
  }

  static signingFailed(reason: string): SigningException {
    return new SigningException(
      SigningErrorCode.SIGNING_FAILED,
      `Error al firmar el XML: ${reason}`,
    );
  }
}
