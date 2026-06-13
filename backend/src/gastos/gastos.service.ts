import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Gasto } from './gasto.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

// Mapa categoría de gasto → código de cuenta contable de gasto
const CUENTA_POR_CATEGORIA: Record<string, string> = {
  Salarios: '5300',
  Publicidad: '5500',
  'Servicios Publicos': '5400',
  Alquiler: '5400',
  Papeleria: '5400',
  Alimentacion: '5400',
  Seguros: '5400',
  Mantenimiento: '5400',
  Impuestos: '5400',
  Combustible: '5400',
  Transporte: '5400',
  Otro: '5700',
};

@Injectable()
export class GastosService {
  private readonly logger = new Logger(GastosService.name);

  constructor(
    @InjectRepository(Gasto) private repo: Repository<Gasto>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  findAll(desde?: string, hasta?: string): Promise<Gasto[]> {
    const where: any = {};
    if (desde && hasta) where.fecha = Between(desde, hasta);
    return this.repo.find({ where, relations: ['proveedor', 'registrado_por'], order: { fecha: 'DESC' } });
  }

  async create(data: Partial<Gasto>, userId: number): Promise<any> {
    const g = this.repo.create({ ...data, registrado_por: { id: userId } as any });
    const saved = await this.repo.save(g);
    await this._registrarAsiento(saved, userId);
    return saved;
  }

  /** Asiento automático de partida doble al registrar un gasto: Debe gasto / Haber caja */
  private async _registrarAsiento(gasto: Gasto, userId: number): Promise<void> {
    try {
      const monto = Number(gasto.monto) || 0;
      if (monto <= 0) return;
      const cuentas = await this.contabilidad['cuentasRepo'].find();
      if (!cuentas.length) return; // plan de cuentas no inicializado
      const porCodigo = (codigo: string) => cuentas.find((c: any) => c.codigo === codigo);

      const codigoGasto = CUENTA_POR_CATEGORIA[gasto.categoria] ?? '5700';
      const cuentaGasto = porCodigo(codigoGasto);
      const cuentaCaja = porCodigo('1100'); // Caja (salida de efectivo)
      if (!cuentaGasto || !cuentaCaja) return;

      await this.contabilidad.crearAsiento({ id: userId } as any, {
        fecha: gasto.fecha,
        descripcion: `Gasto — ${gasto.categoria}: ${gasto.descripcion}`,
        tipo: 'Gasto',
        referencia_id: gasto.id,
        referencia_tipo: 'Gasto',
        lineas: [
          { cuentaId: cuentaGasto.id, debe: monto, haber: 0, descripcion: gasto.descripcion },
          { cuentaId: cuentaCaja.id, debe: 0, haber: monto, descripcion: `Pago de ${gasto.categoria}` },
        ],
      });
    } catch (e) {
      this.logger.warn(`No se pudo crear asiento del gasto #${gasto.id}: ${(e as Error).message}`);
    }
  }

  async update(id: number, data: Partial<Gasto>): Promise<any> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id }, relations: ['proveedor'] });
  }

  async remove(id: number): Promise<any> { await this.repo.delete(id); }

  async resumenPorCategoria(año: number, mes: number): Promise<any[]> {
    const desde = `${año}-${String(mes).padStart(2,'0')}-01`;
    const hasta = `${año}-${String(mes).padStart(2,'0')}-31`;
    const gastos = await this.repo.find({ where: { fecha: Between(desde, hasta) } });
    const mapa: Record<string, number> = {};
    for (const g of gastos) {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + +g.monto;
    }
    return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total }));
  }
}
