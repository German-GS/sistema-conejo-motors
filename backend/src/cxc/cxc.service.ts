import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaCobrar } from './cuenta-cobrar.entity';
import { PagoCxC } from './pago-cxc.entity';

@Injectable()
export class CxcService {
  constructor(
    @InjectRepository(CuentaCobrar) private repo: Repository<CuentaCobrar>,
    @InjectRepository(PagoCxC) private pagoRepo: Repository<PagoCxC>,
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
    await this.pagoRepo.save(p);
    cuenta.monto_pagado = +cuenta.monto_pagado + +pago.monto;
    cuenta.saldo_pendiente = +cuenta.monto_original - +cuenta.monto_pagado;
    cuenta.estado = cuenta.saldo_pendiente <= 0 ? 'Pagado' : 'Pagado Parcial';
    return this.repo.save(cuenta);
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
