import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReciboPago } from './recibo_pago.entity';
import { PlanillaCalculationService } from './planilla-calculation.service';
import { UsersService } from '../users/users.service';
import { Salario } from '../salarios/salario.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { User } from '../users/user.entity';

@Injectable()
export class RecibosPagoService {
  constructor(
    @InjectRepository(ReciboPago)
    private recibosRepository: Repository<ReciboPago>,
    @InjectRepository(Salario)
    private salariosRepository: Repository<Salario>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private calculationService: PlanillaCalculationService,
    private usersService: UsersService,
  ) {}

  async generatePayrollForUser(
    userId: number,
    periodoInicio: string,
    periodoFin: string,
    comisionesGanadas = 0,
    otrasDeducciones = 0,
    horasExtra = 0,
  ): Promise<ReciboPago> {
    const user = await this.usersService.findOneById(userId);

    const salarioMensual = await this.salariosRepository.findOne({
      where: { usuario: { id: userId } },
      order: { fecha_efectiva: 'DESC' },
    });

    if (!salarioMensual) {
      throw new NotFoundException(`Salario no configurado para el usuario.`);
    }

    const diasEnPeriodo =
      (new Date(periodoFin).getTime() - new Date(periodoInicio).getTime()) /
        (1000 * 3600 * 24) +
      1;
    const salarioDelPeriodo =
      (salarioMensual.salario_base / 30) * diasEnPeriodo;

    const salarioBrutoTotal =
      salarioDelPeriodo + comisionesGanadas + horasExtra;

    const payrollResult = await this.calculationService.calculatePayroll(
      salarioBrutoTotal,
      user,
    );

    const desglose = payrollResult.resumenEmpleado.desglose;
    const salarioNetoFinal =
      payrollResult.resumenEmpleado.salarioNeto - otrasDeducciones;

    // Creamos una instancia de la entidad de forma explícita
    const nuevoRecibo = new ReciboPago();
    nuevoRecibo.usuario = user;
    nuevoRecibo.fecha_pago = new Date();
    nuevoRecibo.periodo_inicio = periodoInicio;
    nuevoRecibo.periodo_fin = periodoFin;
    nuevoRecibo.salario_base_periodo = salarioDelPeriodo;
    nuevoRecibo.comisiones_ganadas = comisionesGanadas;
    nuevoRecibo.horas_extra = horasExtra;
    nuevoRecibo.salario_bruto = salarioBrutoTotal;
    nuevoRecibo.deduccion_sem = desglose.sem;
    nuevoRecibo.deduccion_ivm = desglose.ivm;
    nuevoRecibo.deduccion_banco_popular = desglose.bancoPopular;
    nuevoRecibo.deduccion_renta = desglose.renta;
    nuevoRecibo.otras_deducciones = otrasDeducciones;
    nuevoRecibo.salario_neto = salarioNetoFinal;

    return this.recibosRepository.save(nuevoRecibo);
  }

  async getDesglose(id: number): Promise<ReciboPago> {
    const recibo = await this.recibosRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!recibo) {
      throw new NotFoundException(`Recibo con ID #${id} no encontrado.`);
    }
    return recibo;
  }

  async remove(id: number, user: User): Promise<void> {
    const recibo = await this.recibosRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });
    if (!recibo) {
      throw new NotFoundException(`Recibo con ID #${id} no encontrado.`);
    }

    const log = this.auditLogRepository.create({
      usuario: { id: user.id } as User,
      accion: 'ELIMINAR_RECIBO_PAGO',
      detalles: `Recibo ID: ${id}, perteneciente al usuario ID: ${recibo.usuario.id}`,
    });
    await this.auditLogRepository.save(log);

    await this.recibosRepository.delete(id);
  }

  async findAll(): Promise<ReciboPago[]> {
    return this.recibosRepository.find({ relations: ['usuario'] });
  }

  async findOne(id: number): Promise<ReciboPago | null> {
    return this.recibosRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });
  }
}
