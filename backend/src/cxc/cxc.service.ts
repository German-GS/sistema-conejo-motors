import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaCobrar } from './cuenta-cobrar.entity';
import { PagoCxC } from './pago-cxc.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

@Injectable()
export class CxcService {
  constructor(
    @InjectRepository(CuentaCobrar) private repo: Repository<CuentaCobrar>,
    @InjectRepository(PagoCxC) private pagoRepo: Repository<PagoCxC>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  findAll(): Promise<CuentaCobrar[]> {
    return this.repo.find({ relations: ['cliente', 'responsable', 'pagos'], order: { fecha_vencimiento: 'ASC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['cliente', 'responsable', 'pagos'] });
  }

  async create(data: any) {
    const count = await this.repo.count();
    const numero = `CXC-${String(count + 1).padStart(6, '0')}`;
    const cxc = this.repo.create({ ...data, numero, saldo_pendiente: data.monto_original });
    return this.repo.save(cxc);
  }

  async registrarPago(cuentaId: number, pago: any) {
    const cuenta = await this.repo.findOne({ where: { id: cuentaId } });
    if (!cuenta) throw new Error('Cuenta no encontrada');
    const p = this.pagoRepo.create({ ...pago, cuenta: { id: cuentaId } as any });
    const pagoGuardado = await this.pagoRepo.save(p) as unknown as PagoCxC;
    cuenta.monto_pagado = +cuenta.monto_pagado + +pago.monto;
    cuenta.saldo_pendiente = +cuenta.monto_original - +cuenta.monto_pagado;
    cuenta.estado = cuenta.saldo_pendiente <= 0 ? 'Pagado' : 'Pagado Parcial';
    const guardada = await this.repo.save(cuenta);

    // Asiento de cobro: Debe Caja/Banco / Haber Cuentas por Cobrar (1200)
    await this._registrarAsientoCobro(pagoGuardado, pago).catch(() => { /* no bloquear el cobro */ });
    return guardada;
  }

  private async _registrarAsientoCobro(pagoGuardado: PagoCxC, pago: any): Promise<void> {
    const monto = Number(pago.monto) || 0;
    if (monto <= 0) return;
    if (await this.contabilidad.existeAsientoPorReferencia('PagoCxC', pagoGuardado.id)) return;

    const esEfectivo = (pago.metodo_pago ?? '') === 'Efectivo';
    const cuentaCobro = esEfectivo
      ? await this.contabilidad.asegurarCuenta('1100', { nombre: 'Caja', tipo: 'Activo' })
      : await this.contabilidad.asegurarCuenta('1110', { nombre: 'Banco — Cuenta Corriente', tipo: 'Activo' });
    const cxc = await this.contabilidad.asegurarCuenta('1200', { nombre: 'Cuentas por Cobrar', tipo: 'Activo' });

    const fecha = pago.fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    await this.contabilidad.crearAsiento(undefined as any, {
      fecha,
      descripcion: `Cobro CxC — ${esEfectivo ? 'efectivo' : 'banco'} (pago #${pagoGuardado.id})`,
      tipo: 'Ingreso',
      referencia_id: pagoGuardado.id,
      referencia_tipo: 'PagoCxC',
      lineas: [
        { cuentaId: cuentaCobro.id, debe: monto, haber: 0, descripcion: 'Ingreso de efectivo/banco por cobro' },
        { cuentaId: cxc.id, debe: 0, haber: monto, descripcion: 'Descarga de cuenta por cobrar' },
      ],
    });
  }

  async actualizarVencidas(): Promise<void> {
    const hoy = new Date().toISOString().split('T')[0];
    await this.repo.createQueryBuilder()
      .update()
      .set({ estado: 'Vencido' })
      .where('estado = :e AND fecha_vencimiento < :hoy', { e: 'Pendiente', hoy })
      .execute();
  }

  async resumen() {
    await this.actualizarVencidas();
    const todas = await this.repo.find();
    const totalPendiente = todas.filter(c => ['Pendiente', 'Pagado Parcial', 'Vencido'].includes(c.estado))
      .reduce((a, c) => a + +c.saldo_pendiente, 0);
    const vencidas = todas.filter(c => c.estado === 'Vencido').length;
    return { totalPendiente, vencidas, total: todas.length };
  }
}
