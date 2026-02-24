import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  IsPositive,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Ambiente } from '@prisma/client';

/**
 * DTO para iniciar la emisión de una factura desde Bitrix24.
 *
 * En la versión inicial, se puede enviar el dealId y el sistema
 * buscará la información del deal en Bitrix24 (futuro).
 * Opcionalmente se puede enviar la data completa de la factura
 * para el caso en que se conozca de antemano.
 */
export class CompradorDto {
  @IsEnum(['04', '05', '06', '07'], {
    message: 'tipoIdentificacion: 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor Final',
  })
  tipoIdentificacion: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  codigoPrincipal: string;

  @IsOptional()
  @IsString()
  codigoAuxiliar?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @IsPositive()
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;
}

export class EmitInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'dealId es requerido' })
  dealId: string;

  /**
   * Si no se especifica, usa SRI_ENV del .env
   */
  @IsOptional()
  @IsEnum(Ambiente, { message: 'ambiente debe ser TEST o PROD' })
  ambiente?: Ambiente;

  /**
   * Datos del comprador (opcional si se trae de Bitrix24)
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => CompradorDto)
  comprador?: CompradorDto;

  /**
   * Items de la factura (opcional si se trae de Bitrix24)
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}

/**
 * Respuesta al encolar la factura
 */
export class EmitInvoiceResponseDto {
  invoiceId: string;
  status: string;
  message: string;
}
