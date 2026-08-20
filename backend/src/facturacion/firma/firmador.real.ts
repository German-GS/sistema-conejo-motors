import { Injectable, Logger } from '@nestjs/common';
import { Firmador, ResultadoFirma } from './firma.interfaces';
import { SecretsService } from './secrets.service';

/** Nombres de los secretos en Google Secret Manager (ver backend/README.md). */
const SECRET_P12 = 'facturacion-p12';
const SECRET_P12_PIN = 'facturacion-p12-pin';

/**
 * Firmador real: firma el XML con XAdES-EPES usando el certificado .p12 emitido
 * por Hacienda (TRIBU-CR), vía @dojocoding/hacienda-sdk. El .p12 y su PIN se leen
 * de Secret Manager (nunca del código ni de variables de entorno en texto plano).
 *
 * @dojocoding/hacienda-sdk es un paquete ESM puro (sin build CommonJS) — el
 * backend compila a CJS, así que se carga con `import()` dinámico en vez de
 * un `import` estático, que es el mecanismo estándar de Node para que código
 * CJS consuma un paquete ESM-only.
 */
@Injectable()
export class FirmadorReal implements Firmador {
  private readonly logger = new Logger(FirmadorReal.name);

  constructor(private readonly secrets: SecretsService) {}

  async firmar(xmlSinFirma: string): Promise<ResultadoFirma> {
    const { signXml } = await import('@dojocoding/hacienda-sdk');
    const [p12Buffer, p12Pin] = await Promise.all([
      this.secrets.leerBuffer(SECRET_P12),
      this.secrets.leerTexto(SECRET_P12_PIN),
    ]);
    try {
      const xmlFirmado = await signXml(xmlSinFirma, p12Buffer, p12Pin);
      return { xml: xmlFirmado, firmado: true };
    } catch (err) {
      this.logger.error('Falló la firma XAdES-EPES del comprobante.', err as Error);
      throw err;
    }
  }
}
