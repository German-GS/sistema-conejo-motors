import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntidadFinanciera } from './entidad-financiera.entity';
import { EntidadFinancieraDocumento } from './entidad-financiera-documento.entity';

const DEFAULTS = ['Lafise', 'Banco Promerica', 'Davivienda', 'Coopenae', 'Flexi Leasing'];

@Injectable()
export class EntidadesFinancierasService {
  constructor(
    @InjectRepository(EntidadFinanciera)
    private repo: Repository<EntidadFinanciera>,
    @InjectRepository(EntidadFinancieraDocumento)
    private docsRepo: Repository<EntidadFinancieraDocumento>,
  ) {}

  findAll(): Promise<EntidadFinanciera[]> {
    return this.repo.find({ order: { orden: 'ASC', nombre: 'ASC' } });
  }

  findActivas(): Promise<EntidadFinanciera[]> {
    return this.repo.find({ where: { activa: true }, order: { orden: 'ASC', nombre: 'ASC' } });
  }

  async create(nombre: string): Promise<EntidadFinanciera> {
    const entidad = this.repo.create({ nombre: nombre.trim() });
    return this.repo.save(entidad);
  }

  async update(id: number, data: Partial<EntidadFinanciera>): Promise<EntidadFinanciera> {
    const entidad = await this.repo.findOneBy({ id });
    if (!entidad) throw new NotFoundException(`Entidad #${id} no encontrada.`);
    if (data.nombre !== undefined) entidad.nombre = data.nombre.trim();
    if (data.activa !== undefined) entidad.activa = data.activa;
    if (data.orden !== undefined) entidad.orden = data.orden;
    return this.repo.save(entidad);
  }

  async remove(id: number): Promise<{ ok: boolean }> {
    await this.repo.delete(id);
    return { ok: true };
  }

  async addDocumento(
    entidadId: number,
    data: { nombre: string; url: string; tipo_mime?: string; tamano_bytes?: number },
  ): Promise<EntidadFinancieraDocumento> {
    const entidad = await this.repo.findOneBy({ id: entidadId });
    if (!entidad) throw new NotFoundException(`Entidad #${entidadId} no encontrada.`);
    const doc = this.docsRepo.create({
      nombre: data.nombre,
      url: data.url,
      tipo_mime: data.tipo_mime,
      tamano_bytes: data.tamano_bytes ?? 0,
      entidad: { id: entidadId } as EntidadFinanciera,
    });
    return this.docsRepo.save(doc);
  }

  async removeDocumento(docId: number): Promise<{ ok: boolean }> {
    await this.docsRepo.delete(docId);
    return { ok: true };
  }

  /** Crea las entidades por defecto si no hay ninguna */
  async seed(): Promise<{ seeded: number }> {
    const count = await this.repo.count();
    if (count > 0) return { seeded: 0 };
    let orden = 0;
    for (const nombre of DEFAULTS) {
      await this.repo.save(this.repo.create({ nombre, orden: orden++ }));
    }
    return { seeded: DEFAULTS.length };
  }
}
