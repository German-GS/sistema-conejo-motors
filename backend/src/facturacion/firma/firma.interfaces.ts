/**
 * Seams de firma y transmisión a Hacienda. La implementación real (XAdES-BES + API
 * de recepción de TRIBU-CR) se enchufa aquí cuando exista el certificado .p12 y las
 * credenciales del IDP, SIN tocar facturacion.service. Hoy se usan las NoOp.
 */

export const FIRMADOR = Symbol('FIRMADOR');
export const HACIENDA_CLIENT = Symbol('HACIENDA_CLIENT');

export interface ResultadoFirma {
  /** XML resultante (firmado en prod; en NoOp, el borrador sin firmar). */
  xml: string;
  /** true solo cuando la firma es criptográficamente real. */
  firmado: boolean;
}

export interface Firmador {
  /** Firma el XML (XAdES-BES) en producción. En NoOp devuelve el borrador sin firmar. */
  firmar(xmlSinFirma: string): Promise<ResultadoFirma>;
}

export type EstadoEnvio = 'Enviada' | 'Borrador';
export type EstadoHacienda = 'Aceptada' | 'Rechazada' | 'Procesando' | 'Borrador';

export interface ResultadoEnvio {
  estado: EstadoEnvio;
  mensaje?: string;
}

export interface ResultadoConsulta {
  estado: EstadoHacienda;
  xmlRespuesta?: string;
}

export interface HaciendaClient {
  /** POST del comprobante firmado al API de recepción. NoOp no hace red y deja Borrador. */
  enviar(claveNumerica: string, xmlFirmado: string): Promise<ResultadoEnvio>;
  /** Consulta el estado del comprobante. NoOp devuelve Borrador. */
  consultarEstado(claveNumerica: string): Promise<ResultadoConsulta>;
}
