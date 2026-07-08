import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaPagar } from './cuenta-pagar.entity';
import { PagoCxP } from './pago-cxp.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

@Injectable()
export class CxpService {
  constructor(
    @InjectRepository(CuentaPagar) private repo: Repository<CuentaPagar>,
    @InjectRepository(PagoCxP) private pagoRepo: Repository<PagoCxP>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  findAll(): Promise<CuentaPagar[]> {
    return this.repo.find({ relations: ['proveedor', 'pagos'], order: { fecha_vencimiento: 'ASC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['proveedor', 'pagos'] });
  }

  async create(data: any) {
    const count = await this.repo.count();
    const numero = `CXP-${String(count + 1).padStart(6, '0')}`;
    const cxp = this.repo.create({ ...data, numero, saldo_pendiente: data.monto_original });
    return this.repo.save(cxp);
  }

  async registrarPago(cuentaId: number, pago: any) {
    const cuenta = await this.repo.findOne({ where: { id: cuentaId } });
    if (!cuenta) throw new Error('Cuenta no encontrada');
    const p = this.pagoRepo.create({ ...pago, cuenta: { id: cuentaId } as any });
    const pagoGuardado = await this.pagoRepo.save(p) as unknown as PagoCxP;
    cuenta.monto_pagado = +cuenta.monto_pagado + +pago.monto;
    cuenta.saldo_pendiente = +cuenta.monto_original - +cuenta.monto_pagado;
    cuenta.estado = cuenta.saldo_pendiente <= 0 ? 'Pagado' : 'Pagado Parcial';
    const guardada = await this.repo.save(cuenta);

    // Asiento de pago: Debe Cuentas por Pagar (2100) / Haber Caja/Banco
    await this._registrarAsientoPago(pagoGuardado, pago).catch(() => { /* no bloquear el pago */ });
    return guardada;
  }

  private async _registrarAsientoPago(pagoGuardado: PagoCxP, pago: any): Promise<void> {
    const monto = Number(pago.monto) || 0;
    if (monto <= 0) return;
    if (await this.contabilidad.existeAsientoPorReferencia('PagoCxP', pagoGuardado.id)) return;

    const esEfectivo = (pago.metodo_pago ?? '') === 'Efectivo';
    const cuentaSalida = esEfectivo
      ? await this.contabilidad.asegurarCuenta('1100', { nombre: 'Caja', tipo: 'Activo' })
      : await this.contabilidad.asegurarCuenta('1110', { nombre: 'Banco — Cuenta Corriente', tipo: 'Activo' });
    const cxp = await this.contabilidad.asegurarCuenta('2100', { nombre: 'Cuentas por Pagar', tipo: 'Pasivo' });

    const fecha = pago.fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    await this.contabilidad.crearAsiento(undefined as any, {
      fecha,
      descripcion: `Pago CxP — ${esEfectivo ? 'efectivo' : 'banco'} (pago #${pagoGuardado.id})`,
      tipo: 'Gasto',
      referencia_id: pagoGuardado.id,
      referencia_tipo: 'PagoCxP',
      lineas: [
        { cuentaId: cxp.id, debe: monto, haber: 0, descripcion: 'Cancelación de cuenta por pagar' },
        { cuentaId: cuentaSalida.id, debe: 0, haber: monto, descripcion: 'Salida de efectivo/banco por pago' },
      ],
    });
  }

  async resumen() {
    const hoy = new Date().toISOString().split('T')[0];
    await this.repo.createQueryBuilder().update()
      .set({ estado: 'Vencido' })
      .where('estado = :e AND fecha_vencimiento < :hoy', { e: 'Pendiente', hoy })
      .execute();
    const todas = await this.repo.find();
    const totalPendiente = todas.filter(c => ['Pendiente', 'Pagado Parcial', 'Vencido'].includes(c.estado))
      .reduce((a, c) => a + +c.saldo_pendiente, 0);
    const vencidas = todas.filter(c => c.estado === 'Vencido').length;
    return { totalPendiente, vencidas, total: todas.length };
  }
}
