import { HttpException, HttpStatus } from '@nestjs/common';

export enum InvoiceErrorCode {
  NOT_FOUND = 'INVOICE_NOT_FOUND',
  INVALID_STATE = 'INVOICE_INVALID_STATE',
  SEQUENCE_ERROR = 'INVOICE_SEQUENCE_ERROR',
  XML_GENERATION_FAILED = 'INVOICE_XML_GENERATION_FAILED',
  ALREADY_PROCESSING = 'INVOICE_ALREADY_PROCESSING',
  DEAL_NOT_FOUND = 'INVOICE_DEAL_NOT_FOUND',
}

export class InvoiceException extends HttpException {
  public readonly code: InvoiceErrorCode;

  constructor(
    code: InvoiceErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode: status,
        error: 'Invoice Error',
        message,
        code,
      },
      status,
    );
    this.code = code;
  }

  static notFound(invoiceId: string): InvoiceException {
    return new InvoiceException(
      InvoiceErrorCode.NOT_FOUND,
      `Factura no encontrada: ${invoiceId}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static invalidState(
    invoiceId: string,
    currentState: string,
    expectedStates: string[],
  ): InvoiceException {
    return new InvoiceException(
      InvoiceErrorCode.INVALID_STATE,
      `Factura ${invoiceId} en estado ${currentState}, se esperaba: ${expectedStates.join(' | ')}`,
    );
  }

  static xmlGenerationFailed(reason: string): InvoiceException {
    return new InvoiceException(
      InvoiceErrorCode.XML_GENERATION_FAILED,
      `Error generando XML: ${reason}`,
    );
  }

  static alreadyProcessing(dealId: string): InvoiceException {
    return new InvoiceException(
      InvoiceErrorCode.ALREADY_PROCESSING,
      `Ya existe una factura en proceso para el deal: ${dealId}`,
      HttpStatus.CONFLICT,
    );
  }

  static dealNotFound(dealId: string): InvoiceException {
    return new InvoiceException(
      InvoiceErrorCode.DEAL_NOT_FOUND,
      `Deal no encontrado en Bitrix24: ${dealId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}
