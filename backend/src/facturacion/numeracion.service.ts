import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomInt } from 'crypto';
import { ConsecutivoContador } from './consecutivo-contador.entity';

export type TipoComprobante = '01' | '02' | '03' | '04' | '08' | '09';

export interface DatosConsecutivo {
  sucursal?: string; // 3 dígitos (default '001')
  terminal?: string; // 5 dígitos (default '00001')
  tipo: TipoComprobante; // 2 dígitos
  secuencial: number | string; // 10 dígitos
}

export interface DatosClave {
  cedulaEmisor: string; // se rellena a 12 dígitos
  consecutivo: string; // 20 dígitos (ver armarConsecutivo)
  fecha?: Date; // fecha de emisión (default: ahora)
  situacion?: '1' | '2' | '3'; // 1 normal, 2 contingencia, 3 sin internet
  codigoSeguridad?: string; // 8 dígitos; si no se pasa, se genera
}

/**
 * Genera la clave numérica (50) y el consecutivo (20) oficiales de Hacienda Costa Rica.
 * Es puro/determinista salvo por el código de seguridad aleatorio (que puede fijarse).
 *
 * Consecutivo (20) = sucursal(3) + terminal(5) + tipo(2) + secuencial(10)
 * Clave (50)       = 506 + DDMMAA + cédula(12) + consecutivo(20) + situación(1) + seguridad(8)
 */
@Injectable()
export class NumeracionService {
  private readonly logger = new Logger(NumeracionService.name);

  constructor(
    @InjectRepository(ConsecutivoContador)
    private readonly contadoresRepo: Repository<ConsecutivoContador>,
    private readonly dataSource: DataSource,
  ) {}

  private soloDigitos(s: string): string {
    return String(s ?? '').replace(/\D/g, '');
  }

  private padLeft(s: string | number, len: number): string {
    const clean = this.soloDigitos(String(s));
    if (clean.length > len) return clean.slice(-len); // conserva los menos significativos
    return clean.padStart(len, '0');
  }

  /** Arma el consecutivo de 20 dígitos. No consume secuencia (usa el que se le pasa). */
  armarConsecutivo(datos: DatosConsecutivo): string {
    const sucursal = this.padLeft(datos.sucursal ?? '001', 3);
    const terminal = this.padLeft(datos.terminal ?? '00001', 5);
    const tipo = this.padLeft(datos.tipo, 2);
    const secuencial = this.padLeft(datos.secuencial, 10);
    return `${sucursal}${terminal}${tipo}${secuencial}`;
  }

  /** Genera un código de seguridad de 8 dígitos. */
  generarCodigoSeguridad(): string {
    return this.padLeft(randomInt(0, 100000000), 8);
  }

  /** Arma la clave numérica de 50 dígitos a partir del consecutivo (20) ya armado. */
  armarClave(datos: DatosClave): { clave: string; codigoSeguridad: string; situacion: string } {
    const fecha = datos.fecha ?? new Date();
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const aa = String(fecha.getFullYear()).slice(-2);
    const ddmmaa = `${dd}${mm}${aa}`;

    const cedula = this.padLeft(datos.cedulaEmisor, 12);
    const consecutivo = this.padLeft(datos.consecutivo, 20);
    const situacion = datos.situacion ?? '1';
    const codigoSeguridad = datos.codigoSeguridad
      ? this.padLeft(datos.codigoSeguridad, 8)
      : this.generarCodigoSeguridad();

    const clave = `506${ddmmaa}${cedula}${consecutivo}${situacion}${codigoSeguridad}`;
    if (clave.length !== 50) {
      throw new Error(`Clave numérica inválida: longitud ${clave.length} (esperado 50). Partes: 506|${ddmmaa}|${cedula}|${consecutivo}|${situacion}|${codigoSeguridad}`);
    }
    return { clave, codigoSeguridad, situacion };
  }

  /**
   * Reserva atómicamente el siguiente secuencial para (sucursal, terminal, tipo).
   * Usa un UPSERT + UPDATE ... RETURNING para que dos requests concurrentes nunca
   * obtengan el mismo número. Devuelve el secuencial como número entero.
   *
   * ⚠️ En modo interino (sin firma/envío) NO se debe llamar: el consecutivo definitivo
   * solo se consume al firmar+enviar de verdad, para no dejar huecos en la numeración.
   */
  async siguienteSecuencial(sucursal = '001', terminal = '00001', tipo: TipoComprobante = '01'): Promise<number> {
    const suc = this.padLeft(sucursal, 3);
    const term = this.padLeft(terminal, 5);
    const tip = this.padLeft(tipo, 2);

    return this.dataSource.transaction(async (manager) => {
      // Asegurar la fila (sin pisar el contador si ya existe).
      await manager
        .createQueryBuilder()
        .insert()
        .into(ConsecutivoContador)
        .values({ sucursal: suc, terminal: term, tipo: tip, ultimo: '0' })
        .orIgnore()
        .execute();

      // Incremento atómico con RETURNING.
      const res = await manager
        .createQueryBuilder()
        .update(ConsecutivoContador)
        .set({ ultimo: () => 'ultimo + 1' })
        .where('sucursal = :suc AND terminal = :term AND tipo = :tip', { suc, term, tip })
        .returning('ultimo')
        .execute();

      const nuevo = Number(res.raw?.[0]?.ultimo ?? res.raw?.[0]?.ULTIMO);
      if (!Number.isFinite(nuevo) || nuevo <= 0) {
        throw new Error('No se pudo reservar el secuencial del comprobante.');
      }
      return nuevo;
    });
  }

  /**
   * Genera clave + consecutivo definitivos consumiendo la secuencia atómica.
   * Solo para el momento de firmar+enviar (producción).
   */
  async generarDefinitivo(opts: {
    cedulaEmisor: string;
    tipo?: TipoComprobante;
    sucursal?: string;
    terminal?: string;
    fecha?: Date;
    situacion?: '1' | '2' | '3';
  }): Promise<{ clave: string; consecutivo: string; codigoSeguridad: string; situacion: string; secuencial: number }> {
    const tipo = opts.tipo ?? '01';
    const secuencial = await this.siguienteSecuencial(opts.sucursal, opts.terminal, tipo);
    const consecutivo = this.armarConsecutivo({ sucursal: opts.sucursal, terminal: opts.terminal, tipo, secuencial });
    const { clave, codigoSeguridad, situacion } = this.armarClave({
      cedulaEmisor: opts.cedulaEmisor,
      consecutivo,
      fecha: opts.fecha,
      situacion: opts.situacion,
    });
    return { clave, consecutivo, codigoSeguridad, situacion, secuencial };
  }
}
