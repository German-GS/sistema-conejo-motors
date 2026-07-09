import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { LineaCompra } from './linea-compra.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

@Injectable()
export class ComprasService {
  private readonly logger = new Logger(ComprasService.name);
  constructor(
    @InjectRepository(OrdenCompra) private repo: Repository<OrdenCompra>,
    @InjectRepository(LineaCompra) private lineaRepo: Repository<LineaCompra>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  /**
   * Asiento de compra al RECIBIR la orden: Debe 1400 Inventario Repuestos (subtotal)
   * + Debe 1210 IVA Acreditable (iva) / Haber 2100 Cuentas por Pagar (total).
   * El IVA entra al crédito fiscal (D-150). Idempotente por referencia.
   */
  private async _registrarAsientoCompra(ordenId: number, userId?: number): Promise<void> {
    const orden = await this.repo.findOneBy({ id: ordenId });
    if (!orden || orden.estado !== 'Recibida') return;
    const subtotal = Number(orden.subtotal) || 0;
    const iva = Number(orden.iva) || 0;
    const total = Number(orden.total) || (subtotal + iva);
    if (total <= 0) return;
    if (await this.contabilidad.existeAsientoPorReferencia('OrdenCompra', orden.id)) return;

    const cInv = await this.contabilidad.asegurarCuenta('1400', { nombre: 'Inventario Repuestos y Accesorios', tipo: 'Activo' });
    const cCxp = await this.contabilidad.asegurarCuenta('2100', { nombre: 'Cuentas por Pagar', tipo: 'Pasivo' });
    const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
      { cuentaId: cInv.id, debe: subtotal, haber: 0, descripcion: `Ingreso compra ${orden.numero}` },
    ];
    if (iva > 0) {
      const cIva = await this.contabilidad.asegurarCuenta('1210', { nombre: 'IVA Acreditable (Crédito Fiscal)', tipo: 'Activo' });
      lineas.push({ cuentaId: cIva.id, debe: iva, haber: 0, descripcion: `IVA acreditable ${orden.numero}` });
    }
    lineas.push({ cuentaId: cCxp.id, debe: 0, haber: total, descripcion: `Por pagar — ${orden.numero}` });

    await this.contabilidad
      .crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
        fecha: orden.fecha,
        descripcion: `Compra ${orden.numero}${orden.proveedor ? ` — ${(orden.proveedor as any).nombre ?? ''}` : ''}`,
        tipo: 'Compra',
        referencia_id: orden.id,
        referencia_tipo: 'OrdenCompra',
        lineas,
      })
      .catch((e) => this.logger.error(`Asiento compra ${orden.numero}: ${(e as Error).message}`));
  }

  findAll(): Promise<OrdenCompra[]> {
    return this.repo.find({ relations: ['proveedor', 'creado_por', 'lineas'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['proveedor', 'creado_por', 'lineas'] });
  }

  async create(data: any, userId: number) {
    const count = await this.repo.count();
    const numero = `OC-${String(count + 1).padStart(6, '0')}`;
    const { lineas, ...rest } = data;
    const orden = this.repo.create({ ...rest, numero, creado_por: { id: userId } as any });
    const saved = await this.repo.save(orden)  as unknown as OrdenCompra;
    if (lineas?.length) {
      for (const l of lineas) {
        const linea = this.lineaRepo.create({ ...l, orden: { id: saved.id } as any });
        await this.lineaRepo.save(linea);
      }
    }
    if (saved.estado === 'Recibida') await this._registrarAsientoCompra(saved.id, userId);
    return this.findOne(saved.id);
  }

  async update(id: number, data: Partial<OrdenCompra>, userId?: number) {
    await this.repo.update(id, data);
    // Al marcar la orden como Recibida, se contabiliza (idempotente).
    if (data.estado === 'Recibida') await this._registrarAsientoCompra(id, userId);
    return this.findOne(id);
  }
}
