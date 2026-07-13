import { Injectable, Logger, OnApplicationBootstrap, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as XLSX from 'xlsx';
import { Cabys } from './cabys.entity';

/** Códigos CABYS de uso frecuente en el negocio (concesionaria EV + taller). */
export const CABYS_DEFAULTS = {
  VEHICULO_ELECTRICO: '4911315000000', // Vehículos eléctricos
  VEHICULO_HIBRIDO: '4911316000000', // Vehículos híbridos
  VEHICULO_HIDROGENO: '4911314000000', // Movidos por celdas de combustible / aire comprimido
  REPUESTOS_AUTO: '4912999009900', // Partes y accesorios de vehículos automotores, n.c.p.
  SERVICIO_MANTENIMIENTO: '8714100000200', // Servicios de mantenimiento y reparación de automóviles
} as const;

// Semilla curada para que validación y sugerencias funcionen sin importar las 20 000 filas.
const SEED: { codigo: string; descripcion: string; impuesto: number }[] = [
  { codigo: '4911315000000', descripcion: 'Vehículos eléctricos', impuesto: 0.13 },
  { codigo: '4911316000000', descripcion: 'Vehículos híbridos', impuesto: 0.13 },
  { codigo: '4911314000000', descripcion: 'Vehículos movidos por energía eléctrica; celdas de combustible (hidrógeno) o aire comprimido', impuesto: 0.13 },
  { codigo: '4911399000000', descripcion: 'Automóviles y otros vehículos automotores n.c.p. para transporte de personas', impuesto: 0.13 },
  { codigo: '4912999009900', descripcion: 'Partes y accesorios de vehículos automotores, n.c.p.', impuesto: 0.13 },
  { codigo: '4912905009900', descripcion: 'Ruedas, sus partes y accesorios, para vehículos automotores, n.c.p.', impuesto: 0.13 },
  { codigo: '3611100000000', descripcion: 'Llantas (neumáticos) de caucho, para automóviles', impuesto: 0.13 },
  { codigo: '4642001000200', descripcion: 'Acumuladores eléctricos de plomo para propulsión de vehículos eléctricos', impuesto: 0.13 },
  { codigo: '8714100000200', descripcion: 'Servicios de mantenimiento y reparación de automóviles', impuesto: 0.13 },
  { codigo: '8714100000100', descripcion: 'Servicios de mantenimiento y reparación de vehículos automotores para transporte', impuesto: 0.13 },
];

@Injectable()
export class CabysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CabysService.name);

  constructor(
    @InjectRepository(Cabys) private readonly repo: Repository<Cabys>,
  ) {}

  async onApplicationBootstrap() {
    try {
      // Sembrar solo los códigos del negocio si aún no están (no pisa el catálogo completo).
      for (const s of SEED) {
        const existe = await this.repo.findOneBy({ codigo: s.codigo });
        if (!existe) await this.repo.save(this.repo.create(s));
      }
    } catch (e) {
      this.logger.warn(`No se pudo sembrar CABYS base: ${(e as Error).message}`);
    }
  }

  /** ¿Cuántos códigos hay cargados? (para saber si falta importar el catálogo completo). */
  async total(): Promise<number> {
    return this.repo.count();
  }

  async buscar(q: string, limit = 25): Promise<Cabys[]> {
    const term = (q ?? '').trim();
    if (!term) return [];
    // Por código (prefijo) o por descripción (contiene).
    if (/^\d+$/.test(term)) {
      return this.repo.find({ where: { codigo: ILike(`${term}%`) }, take: limit, order: { codigo: 'ASC' } });
    }
    return this.repo.find({ where: { descripcion: ILike(`%${term}%`) }, take: limit, order: { codigo: 'ASC' } });
  }

  /** Valida un código y devuelve su descripción y tarifa sugerida. */
  async validar(codigo: string): Promise<{ valido: boolean; codigo: string; descripcion?: string; tarifaSugerida?: number }> {
    const cod = (codigo ?? '').trim();
    if (!/^\d{13}$/.test(cod)) {
      throw new BadRequestException('El código CABYS debe tener 13 dígitos.');
    }
    const c = await this.repo.findOneBy({ codigo: cod });
    if (!c) return { valido: false, codigo: cod };
    return { valido: true, codigo: cod, descripcion: c.descripcion, tarifaSugerida: Number(c.impuesto) };
  }

  /**
   * Importa/actualiza el catálogo completo desde el Excel oficial (BCCR/Hacienda).
   * Estructura: hoja 'Catálogo', código de 13 díg. en la columna 'Categoría 9' (índice 16),
   * descripción en 17, impuesto (fracción, p.ej. 0.13) en 18. 'Exento'/no numérico → 0.
   */
  async importarExcel(buffer: Buffer): Promise<{ importados: number; total: number }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const hoja = wb.Sheets['Catálogo'] ?? wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });

    const registros: Cabys[] = [];
    for (const r of rows.slice(2)) {
      const codigo = String(r[16] ?? '').trim();
      if (!/^\d{13}$/.test(codigo)) continue;
      const descripcion = String(r[17] ?? '').trim().slice(0, 500);
      const raw = r[18];
      const impuesto = typeof raw === 'number' ? raw : 0; // 'Exento'/'' → 0
      registros.push(this.repo.create({ codigo, descripcion, impuesto }));
    }

    // Upsert por lotes para no saturar memoria/conexión.
    const CHUNK = 1000;
    for (let i = 0; i < registros.length; i += CHUNK) {
      await this.repo.upsert(registros.slice(i, i + CHUNK), ['codigo']);
    }
    this.logger.log(`CABYS importado: ${registros.length} códigos.`);
    return { importados: registros.length, total: await this.total() };
  }
}
