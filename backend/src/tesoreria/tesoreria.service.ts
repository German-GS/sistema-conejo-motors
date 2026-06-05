import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { MovimientoBancario } from './movimiento-bancario.entity';

@Injectable()
export class TesoreriaService {
  constructor(
    @InjectRepository(CuentaBancaria) private cuentaRepo: Repository<CuentaBancaria>,
    @InjectRepository(MovimientoBancario) private movRepo: Repository<MovimientoBancario>,
  ) {}

  findCuentas(): Promise<CuentaBancaria[]> {
    return this.cuentaRepo.find({ where: { activa: true }, order: { banco: 'ASC' } });
  }

  async createCuenta(data: Partial<CuentaBancaria>) {
    const c = this.cuentaRepo.create({ ...data, saldo_actual: data.saldo_inicial || 0 });
    return this.cuentaRepo.save(c);
  }

  async findMovimientos(cuentaId: number, desde?: string, hasta?: string): Promise<MovimientoBancario[]> {
    const where: any = { cuenta: { id: cuentaId } };
    if (desde && hasta) where.fecha = Between(desde, hasta);
    return this.movRepo.find({ where, relations: ['registrado_por'], order: { fecha: 'DESC' } });
  }

  async registrarMovimiento(cuentaId: number, data: any, userId: number) {
    const cuenta = await this.cuentaRepo.findOne({ where: { id: cuentaId } });
    if (!cuenta) throw new NotFoundException();
    const mov = this.movRepo.create({ ...data, cuenta: { id: cuentaId } as any, registrado_por: { id: userId } as any });
    await this.movRepo.save(mov);
    const esEntrada = ['Deposito', 'Transferencia Entrada', 'Cobro'].includes(data.tipo);
    cuenta.saldo_actual = esEntrada
      ? +cuenta.saldo_actual + +data.monto
      : +cuenta.saldo_actual - +data.monto;
    await this.cuentaRepo.save(cuenta);
    return mov;
  }

  async conciliar(movId: number): Promise<void> {
    await this.movRepo.update(movId, { conciliado: true });
  }

  async resumen() {
    const cuentas = await this.cuentaRepo.find({ where: { activa: true } });
    const totalCRC = cuentas.filter(c => c.moneda === 'CRC').reduce((a, c) => a + +c.saldo_actual, 0);
    const totalUSD = cuentas.filter(c => c.moneda === 'USD').reduce((a, c) => a + +c.saldo_actual, 0);
    return { cuentas, totalCRC, totalUSD };
  }
}
