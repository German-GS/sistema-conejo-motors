import { Injectable, Logger } from '@nestjs/common';
import { Firmador, ResultadoFirma } from './firma.interfaces';

/**
 * Firmador simulado (sin certificado .p12). NO firma criptográficamente: marca el XML
 * como borrador. Se reemplaza por el firmador XAdES-BES real cuando lleguen las llaves.
 */
@Injectable()
export class FirmadorNoop implements Firmador {
  private readonly logger = new Logger(FirmadorNoop.name);

  async firmar(xmlSinFirma: string): Promise<ResultadoFirma> {
    this.logger.warn('Firma OMITIDA (modo interino sin certificado .p12). El comprobante NO es válido fiscalmente.');
    const xml = xmlSinFirma.includes('</FacturaElectronica>')
      ? xmlSinFirma.replace('</FacturaElectronica>', '<!-- BORRADOR: sin firma XAdES --></FacturaElectronica>')
      : xmlSinFirma;
    return { xml, firmado: false };
  }
}
