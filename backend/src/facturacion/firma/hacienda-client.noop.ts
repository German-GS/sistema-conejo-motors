import { Injectable, Logger } from '@nestjs/common';
import { HaciendaClient, ResultadoEnvio, ResultadoConsulta } from './firma.interfaces';

/**
 * Cliente de Hacienda simulado. NO hace ninguna llamada de red: deja el comprobante en
 * Borrador. Se reemplaza por el cliente real (token OAuth del IDP + POST al API de
 * recepción de TRIBU-CR) cuando existan las credenciales.
 */
@Injectable()
export class HaciendaClientNoop implements HaciendaClient {
  private readonly logger = new Logger(HaciendaClientNoop.name);

  async enviar(claveNumerica: string): Promise<ResultadoEnvio> {
    this.logger.warn(`Envío OMITIDO (modo interino) para clave ${claveNumerica}. Documento queda en Borrador.`);
    return { estado: 'Borrador', mensaje: 'Modo interino: sin transmisión a Hacienda.' };
  }

  async consultarEstado(claveNumerica: string): Promise<ResultadoConsulta> {
    this.logger.debug(`Consulta OMITIDA (modo interino) para clave ${claveNumerica}.`);
    return { estado: 'Borrador' };
  }
}
