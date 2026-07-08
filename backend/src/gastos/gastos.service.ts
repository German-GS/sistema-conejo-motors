import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, EntityManager } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  /** Contrapartida contable según el método de pago del gasto. */
  private codigoContrapartida(metodo?: string): string {
    switch ((metodo ?? 'Efectivo').toLowerCase()) {
      case 'credito':
      case 'crédito':
        return '2100'; // Cuentas por Pagar (gasto a crédito)
      case 'banco':
      case 'tarjeta':
      case 'sinpe':
      case 'transferencia':
      case 'cheque':
        return '1110'; // Banco
      default:
        return '1100'; // Caja (efectivo)
    }
  }

  findAll(desde?: string, hasta?: string): Promise<Gasto[]> {
    const where: any = {};
    if (desde && hasta) where.fecha = Between(desde, hasta);
    return this.repo.find({ where, relations: ['proveedor', 'registrado_por'], order: { fecha: 'DESC' } });
  }

  async create(data: Partial<Gasto>, userId: number): Promise<any> {
    // Atómico: el gasto y su asiento se guardan (o se revierten) juntos.
    return this.dataSource.transaction(async (manager) => {
      const g = manager.getRepository(Gasto).create({ ...data, registrado_por: { id: userId } as any, contabilizado: false });
      const saved = await manager.getRepository(Gasto).save(g);
      await this._registrarAsiento(saved, userId, manager);
      return manager.getRepository(Gasto).findOneBy({ id: saved.id });
    });
  }

  /**
   * Asiento de partida doble del gasto: Debe cuenta de gasto / Haber contrapartida (según método).
   * Si el plan de cuentas no está inicializado, deja el gasto como no contabilizado (pendiente).
   * Cualquier error de posteo propaga para que la transacción revierta todo.
   */
  private async _registrarAsiento(gasto: Gasto, userId?: number, manager?: EntityManager): Promise<void> {
    const monto = Number(gasto.monto) || 0;
    if (monto <= 0) return;

    const codigoGasto = CUENTA_POR_CATEGORIA[gasto.categoria] ?? '5700';
    const cuentaGasto = await this.contabilidad.asegurarCuenta(codigoGasto, { nombre: 'Gasto', tipo: 'Gasto' });
    const codigoContra = this.codigoContrapartida(gasto.metodo_pago);
    const cuentaContra = await this.contabilidad.asegurarCuenta(codigoContra, {
      nombre: codigoContra === '2100' ? 'Cuentas por Pagar' : codigoContra === '1110' ? 'Banco — Cuenta Corriente' : 'Caja',
      tipo: codigoContra === '2100' ? 'Pasivo' : 'Activo',
    });

    await this.contabilidad.crearAsiento((userId ? { id: userId } : undefined) as any, {
      fecha: gasto.fecha,
      descripcion: `Gasto — ${gasto.categoria}: ${gasto.descripcion}`,
      tipo: 'Gasto',
      referencia_id: gasto.id,
      referencia_tipo: 'Gasto',
      lineas: [
        { cuentaId: cuentaGasto.id, debe: monto, haber: 0, descripcion: gasto.descripcion },
        { cuentaId: cuentaContra.id, debe: 0, haber: monto, descripcion: `${codigoContra === '2100' ? 'Por pagar' : 'Pago'} — ${gasto.categoria}` },
      ],
    }, { manager });

    const repo = manager ? manager.getRepository(Gasto) : this.repo;
    await repo.update(gasto.id, { contabilizado: true });
  }

  async update(id: number, data: Partial<Gasto>): Promise<any> {
    await this.repo.update(id, data);
    const actualizado = await this.repo.findOne({ where: { id }, relations: ['proveedor', 'registrado_por'] });
    // Reversar el asiento anterior y re-postear con el monto/fecha actualizados
    await this.contabilidad
      .reversarAsientosPorReferencia('Gasto', id, undefined, 'Edición de gasto')
      .catch((e) => this.logger.warn(`Reversa gasto #${id}: ${(e as Error).message}`));
    if (actualizado) {
      await this._registrarAsiento(actualizado, actualizado.registrado_por?.id)
        .catch((e) => this.logger.error(`Re-posteo de gasto #${id} falló (queda pendiente): ${(e as Error).message}`));
    }
    return actualizado;
  }

  async remove(id: number): Promise<any> {
    // Reversa contable (no borra el asiento) antes de eliminar el gasto del subledger
    await this.contabilidad
      .reversarAsientosPorReferencia('Gasto', id, undefined, 'Eliminación de gasto')
      .catch((e) => this.logger.warn(`Reversa gasto #${id}: ${(e as Error).message}`));
    await this.repo.delete(id);
  }

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
