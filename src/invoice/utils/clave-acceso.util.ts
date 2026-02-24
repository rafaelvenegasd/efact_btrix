import { Ambiente } from '@prisma/client';
import { SRI_CONSTANTS } from '../types/invoice.types';

/**
 * Genera la Clave de Acceso (49 dígitos) requerida por el SRI Ecuador.
 *
 * Estructura:
 * [ddMMyyyy][tipoComprobante(2)][ruc(13)][ambiente(1)][serie(6)][secuencial(9)][codigoNumerico(8)][tipoEmision(1)][digitoVerificador(1)]
 *
 * Referencia: Ficha Técnica Comprobantes Electrónicos v2.21
 * https://www.sri.gob.ec/comprobantes-electronicos
 */
export function generateClaveAcceso(params: {
  fechaEmision: Date;
  tipoComprobante: string;
  ruc: string;
  ambiente: Ambiente;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  codigoNumerico?: string;
}): string {
  const {
    fechaEmision,
    tipoComprobante,
    ruc,
    ambiente,
    establecimiento,
    puntoEmision,
    secuencial,
  } = params;

  const fecha = formatFecha(fechaEmision);
  const ambienteCodigo = SRI_CONSTANTS.AMBIENTE[ambiente]; // '1' o '2'
  const serie = `${padLeft(establecimiento, 3)}${padLeft(puntoEmision, 3)}`;
  const secuencialPadded = padLeft(secuencial, 9);
  const codigoNumerico = params.codigoNumerico || generateCodigoNumerico();
  const tipoEmision = SRI_CONSTANTS.TIPO_EMISION_NORMAL;

  const claveBase =
    `${fecha}` +
    `${tipoComprobante}` +
    `${ruc}` +
    `${ambienteCodigo}` +
    `${serie}` +
    `${secuencialPadded}` +
    `${codigoNumerico}` +
    `${tipoEmision}`;

  if (claveBase.length !== 48) {
    throw new Error(
      `Clave base inválida, longitud ${claveBase.length}, esperada 48. Clave: ${claveBase}`,
    );
  }

  const digitoVerificador = calculateModulo11(claveBase);
  return `${claveBase}${digitoVerificador}`;
}

/**
 * Valida que una clave de acceso tenga estructura correcta.
 */
export function validateClaveAcceso(claveAcceso: string): boolean {
  if (claveAcceso.length !== 49) return false;
  if (!/^\d+$/.test(claveAcceso)) return false;

  const clave48 = claveAcceso.substring(0, 48);
  const digitoEsperado = calculateModulo11(clave48);
  const digitoActual = parseInt(claveAcceso[48], 10);

  return digitoEsperado === digitoActual;
}

/**
 * Formatea fecha como ddMMaaaa
 */
function formatFecha(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

/**
 * Padding izquierdo con ceros
 */
function padLeft(value: string, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * Genera código numérico aleatorio de 8 dígitos
 */
function generateCodigoNumerico(): string {
  return String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
}

/**
 * Calcula el dígito verificador usando Módulo 11.
 *
 * Algoritmo:
 * 1. Multiplica cada dígito por coeficientes que van de 2 a 7 (cíclicamente, de derecha a izquierda)
 * 2. Suma todos los productos
 * 3. residuo = 11 - (suma % 11)
 * 4. Si residuo == 11 → dígito = 0
 *    Si residuo == 10 → dígito = 1
 *    Otro caso → dígito = residuo
 */
export function calculateModulo11(value: string): number {
  const coefficients = [2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = value.length - 1; i >= 0; i--) {
    const digit = parseInt(value[i], 10);
    const coefficientIndex = (value.length - 1 - i) % coefficients.length;
    sum += digit * coefficients[coefficientIndex];
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return 0;
  if (remainder === 10) return 1;
  return remainder;
}

/**
 * Extrae información de una clave de acceso válida
 */
export function parseClaveAcceso(claveAcceso: string): {
  fechaEmision: string;
  tipoComprobante: string;
  ruc: string;
  ambiente: string;
  serie: string;
  secuencial: string;
  codigoNumerico: string;
  tipoEmision: string;
  digitoVerificador: string;
} {
  return {
    fechaEmision: claveAcceso.substring(0, 8),
    tipoComprobante: claveAcceso.substring(8, 10),
    ruc: claveAcceso.substring(10, 23),
    ambiente: claveAcceso.substring(23, 24),
    serie: claveAcceso.substring(24, 30),
    secuencial: claveAcceso.substring(30, 39),
    codigoNumerico: claveAcceso.substring(39, 47),
    tipoEmision: claveAcceso.substring(47, 48),
    digitoVerificador: claveAcceso.substring(48, 49),
  };
}
