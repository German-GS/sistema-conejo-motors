import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaDepreciacion } from './categoria-depreciacion.entity';

// Defaults razonables (CR) — EDITABLES desde Configuración; verificar contra el
// Reglamento de la Ley del Impuesto sobre la Renta vigente.
const DEFAULTS: Partial<CategoriaDepreciacion>[] = [
  { nombre: 'Vehículos y equipo de transporte', vida_util_meses: 120, tasa_anual: 10, cuenta_activo: '1520', orden: 1 },
  { nombre: 'Equipo de cómputo', vida_util_meses: 60, tasa_anual: 20, cuenta_activo: '1510', orden: 2 },
  { nombre: 'Mobiliario y equipo de oficina', vida_util_meses: 120, tasa_anual: 10, cuenta_activo: '1510', orden: 3 },
  { nombre: 'Maquinaria y equipo', vida_util_meses: 120, tasa_anual: 10, cuenta_activo: '1510', orden: 4 },
  { nombre: 'Herramientas', vida_util_meses: 36, tasa_anual: 33.33, cuenta_activo: '1510', orden: 5 },
  { nombre: 'Equipo de comunicación', vida_util_meses: 60, tasa_anual: 20, cuenta_activo: '1510', orden: 6 },
  { nombre: 'Edificios e instalaciones', vida_util_meses: 600, tasa_anual: 2, cuenta_activo: '1500', orden: 7 },
];

@Injectable()
export class DepreciacionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DepreciacionService.name);
  constructor(
    @InjectRepository(CategoriaDepreciacion)
    private readonly repo: Repository<CategoriaDepreciacion>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const res = await this.seed();
      if (res.seeded > 0) this.logger.log(`[Depreciación] Sembradas ${res.seeded} categorías por defecto.`);
    } catch (e) {
      this.logger.warn(`[Depreciación] No se pudo sembrar la tabla: ${(e as Error).message}`);
    }
  }

  async listar(soloActivas = false): Promise<CategoriaDepreciacion[]> {
    const where = soloActivas ? { activo: true } : {};
    return this.repo.find({ where, order: { orden: 'ASC', nombre: 'ASC' } });
  }

  /** Siembra las categorías por defecto si la tabla está vacía. */
  async seed(): Promise<{ seeded: number }> {
    const count = await this.repo.count();
    if (count > 0) return { seeded: 0 };
    for (const d of DEFAULTS) await this.repo.save(this.repo.create(d));
    return { seeded: DEFAULTS.length };
  }

  async crear(data: Partial<CategoriaDepreciacion>): Promise<CategoriaDepreciacion> {
    return this.repo.save(this.repo.create({
      nombre: data.nombre ?? 'Nueva categoría',
      vida_util_meses: Number(data.vida_util_meses) || 120,
      tasa_anual: Number(data.tasa_anual) || 0,
      cuenta_activo: data.cuenta_activo ?? '1510',
      orden: Number(data.orden) || 99,
      activo: data.activo ?? true,
    }));
  }

  async actualizar(id: number, data: Partial<CategoriaDepreciacion>): Promise<CategoriaDepreciacion> {
    const c = await this.repo.findOneBy({ id });
    if (!c) throw new NotFoundException(`Categoría #${id} no encontrada.`);
    if (data.nombre !== undefined) c.nombre = data.nombre;
    if (data.vida_util_meses !== undefined) c.vida_util_meses = Number(data.vida_util_meses) || c.vida_util_meses;
    if (data.tasa_anual !== undefined) c.tasa_anual = Number(data.tasa_anual) || 0;
    if (data.cuenta_activo !== undefined) c.cuenta_activo = data.cuenta_activo;
    if (data.orden !== undefined) c.orden = Number(data.orden) || 0;
    if (data.activo !== undefined) c.activo = data.activo;
    return this.repo.save(c);
  }

  async eliminar(id: number): Promise<{ ok: true }> {
    await this.repo.delete(id);
    return { ok: true };
  }
}
