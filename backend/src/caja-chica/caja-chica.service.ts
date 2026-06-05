import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CajaChica } from './caja-chica.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

@Injectable()
export class CajaChicaService {
  constructor(
    @InjectRepository(CajaChica) private repo: Repository<CajaChica>,
    @InjectRepository(MovimientoCaja) private movRepo: Repository<MovimientoCaja>,
  ) {}

  findAll(): Promise<CajaChica[]> {
    return this.repo.find({ relations: ['responsable'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['responsable', 'movimientos', 'movimientos.registrado_por'] });
  }

  async create(data: any) {
    const caja = this.repo.create({ ...data, saldo_actual: data.monto_inicial });
    return this.repo.save(caja);
  }

  async registrarMovimiento(cajaId: number, data: any, userId: number) {
    const caja = await this.repo.findOne({ where: { id: cajaId } });
    if (!caja) throw new NotFoundException();
    const mov = this.movRepo.create({ ...data, caja: { id: cajaId } as any, registrado_por: { id: userId } as any });
    await this.movRepo.save(mov);
    if (data.tipo === 'Ingreso') caja.saldo_actual = +caja.saldo_actual + +data.monto;
    else caja.saldo_actual = +caja.saldo_actual - +data.monto;
    return this.repo.save(caja);
  }

  async cerrar(id: number) {
    await this.repo.update(id, { estado: 'Cerrada' });
    return this.findOne(id);
  }

  async reponer(id: number, monto: number, userId: number) {
    await this.registrarMovimiento(id, {
      tipo: 'Ingreso', monto, descripcion: 'Reposición de caja chica',
      categoria: 'Reposicion', fecha: new Date().toISOString().split('T')[0],
    }, userId);
    await this.repo.update(id, { estado: 'Abierta' });
    return this.findOne(id);
  }
}
