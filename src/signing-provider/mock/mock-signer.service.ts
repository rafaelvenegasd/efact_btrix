import { Injectable, Logger } from '@nestjs/common';

/**
 * MockSignerService
 *
 * Implementación mock de la firma digital para desarrollo y testing.
 *
 * La firma REAL requiere:
 * - Certificado PKCS12 (.p12) emitido por entidad acreditada por el BCE
 * - Librería de firma XAdES-BES (ej: node-forge + xmldsigjs)
 * - La firma debe ser: XAdES-BES, tipo Enveloped, algoritmo RSA-SHA1 o RSA-SHA256
 *
 * Para implementar la firma real, reemplazar este servicio con una implementación
 * que use node-forge o la librería de firma que el cliente prefiera.
 *
 * Referencia: Ficha Técnica Comprobantes Electrónicos SRI v2.21
 */
@Injectable()
export class MockSignerService {
  private readonly logger = new Logger(MockSignerService.name);

  /**
   * Simula la firma del XML con XAdES-BES.
   *
   * En la implementación real, este método:
   * 1. Lee el archivo .p12 del disco
   * 2. Extrae la clave privada y el certificado
   * 3. Genera la firma canonicalizada (C14N)
   * 4. Inserta el bloque <ds:Signature> en el XML
   * 5. Retorna el XML firmado
   */
  async sign(xml: string): Promise<string> {
    this.logger.warn(
      '[MOCK SIGNER] Simulando firma XAdES-BES - SOLO PARA DESARROLLO',
    );

    // Simular tiempo de procesamiento de firma
    await this.sleep(200);

    // Agregar un bloque de firma mock al XML
    const mockSignatureBlock = this.buildMockSignatureBlock();
    const signedXml = this.insertSignatureIntoXml(xml, mockSignatureBlock);

    this.logger.debug('[MOCK SIGNER] XML firmado con signature mock');

    return signedXml;
  }

  private buildMockSignatureBlock(): string {
    const mockSignatureValue = Buffer.from(
      `MOCK_SIGNATURE_${Date.now()}_${Math.random()}`,
    ).toString('base64');

    const mockCertValue = Buffer.from('MOCK_CERTIFICATE_VALUE').toString(
      'base64',
    );

    return `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature">
  <ds:SignedInfo>
    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <ds:Reference URI="#comprobante">
      <ds:Transforms>
        <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
      </ds:Transforms>
      <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
      <ds:DigestValue>MOCK_DIGEST_VALUE==</ds:DigestValue>
    </ds:Reference>
  </ds:SignedInfo>
  <ds:SignatureValue>${mockSignatureValue}</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <ds:X509Certificate>${mockCertValue}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
</ds:Signature>`;
  }

  private insertSignatureIntoXml(xml: string, signature: string): string {
    // Insertar la firma antes del cierre del elemento raíz
    const closingTag = '</factura>';
    const insertPoint = xml.lastIndexOf(closingTag);

    if (insertPoint === -1) {
      // Si no encuentra el tag de cierre, agregar al final del XML
      return xml + signature;
    }

    return (
      xml.substring(0, insertPoint) + signature + xml.substring(insertPoint)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
