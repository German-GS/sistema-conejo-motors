import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ReciboPago } from './recibo_pago.entity';
import { PlanillaCalculationService } from './planilla-calculation.service';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { UsersService } from '../users/users.service';
import { Salario } from '../salarios/salario.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { User } from '../users/user.entity';
import { Venta } from '../ventas/venta.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';



@Injectable()
export class RecibosPagoService {
  constructor(
    @InjectRepository(ReciboPago)
    private recibosRepository: Repository<ReciboPago>,
    @InjectRepository(Salario)
    private salariosRepository: Repository<Salario>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(PlanillaParametro)
    private parametrosRepository: Repository<PlanillaParametro>,
    private calculationService: PlanillaCalculationService,
    private usersService: UsersService,
    private contabilidadService: ContabilidadService,
  ) {}

  private readonly logger = new Logger(RecibosPagoService.name);

  async calculateCommissionsForPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalCommission: number }> {
    console.log('\n---[ Service: calculateCommissionsForPeriod ]---');
    console.log(`Buscando ventas para el usuario ID: ${userId}`);
    console.log('Rango de fecha_venta:', { startDate, endDate });
    // 1. Buscar el parámetro de comisión
    const commissionParam = await this.parametrosRepository.findOne({
      where: { nombre: 'COMISION_VENDEDOR_PORC' },
    });

    if (!commissionParam) {
      throw new NotFoundException('Parámetro de comisión no encontrado.');
    }
    const commissionPercentage = Number(commissionParam.valor);

    // 2. Buscar todas las ventas del usuario en el período
    const sales = await this.ventasRepository.find({
      where: {
        vendedor: { id: userId },
        fecha_venta: Between(startDate, endDate),
      },
    });
    console.log(`Se encontraron ${sales.length} ventas en este período.`);
    if (sales.length > 0) {
      console.log('Ventas encontradas:', sales.map(s => ({ id: s.id, fecha: s.fecha_venta, monto: s.monto_final })));
    }

    // 3. Calcular la comisión
    const totalRevenue = sales.reduce(
      (sum, venta) => sum + Number(venta.monto_final),
      0,
    );
    const totalCommission = totalRevenue * (commissionPercentage / 100);

    return { totalCommission };
  }

  async generatePayrollForUser(
    userId: number,
    periodoInicio: string,
    periodoFin: string,
    comisionesGanadas = 0,
    otrasDeducciones = 0,
    horasExtra = 0,
    generadoPor?: User,
  ): Promise<ReciboPago> {
    const user = await this.usersService.findOneById(userId);

    const salarioMensual = await this.salariosRepository.findOne({
      where: { usuario: { id: userId } },
      order: { fecha_efectiva: 'DESC' },
    });

    if (!salarioMensual) {
      throw new NotFoundException(`Salario no configurado para el usuario.`);
    }

    const diasEnPeriodo = Math.round(
      (new Date(periodoFin).getTime() - new Date(periodoInicio).getTime()) /
        (1000 * 3600 * 24),
    ) + 1;

    // En Costa Rica se paga por mes o por quincena. Un período normal debe dar
    // el salario completo (o medio), sin inflarse por el conteo exacto de días.
    // Solo se prorratea cuando el período es realmente parcial (ingreso a mitad
    // de mes, liquidación, etc.).
    const base = Number(salarioMensual.salario_base);
    let salarioDelPeriodo: number;
    if (diasEnPeriodo >= 28 && diasEnPeriodo <= 31) {
      salarioDelPeriodo = base;            // mes completo
    } else if (diasEnPeriodo >= 14 && diasEnPeriodo <= 16) {
      salarioDelPeriodo = base / 2;        // quincena
    } else {
      // período parcial → prorrateo diario, nunca por encima del salario mensual
      salarioDelPeriodo = Math.min(base, (base / 30) * diasEnPeriodo);
    }

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
    nuevoRecibo.periodo_inicio = new Date(`${periodoInicio}T00:00:00`);
    nuevoRecibo.periodo_fin = new Date(`${periodoFin}T00:00:00`);
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

    const reciboGuardado = await this.recibosRepository.save(nuevoRecibo);

    // Asiento contable automático de la planilla
    await this._registrarAsientoPlanilla(reciboGuardado, user, generadoPor);

    return reciboGuardado;
  }

  /**
   * Asiento contable de partida doble al generar un recibo de planilla:
   *   Debe  5300 Gastos de Personal   = salario bruto
   *   Haber 1100 Caja                 = salario neto pagado al colaborador
   *   Haber 2100 Cuentas por Pagar    = deducciones retenidas (CCSS, renta, otras)
   */
  private async _registrarAsientoPlanilla(
    recibo: ReciboPago,
    empleado: User,
    generadoPor?: User,
  ): Promise<void> {
    try {
      const bruto = Number(recibo.salario_bruto) || 0;
      if (bruto <= 0) return;
      const neto = Number(recibo.salario_neto) || 0;
      const retenido = Math.round((bruto - neto) * 100) / 100; // deducciones + otras

      const cuentas = await this.contabilidadService.getCuentas();
      if (!cuentas.length) return; // plan de cuentas no inicializado
      const idDe = (codigo: string) => cuentas.find((c) => c.codigo === codigo)?.id;
      const cGasto = idDe('5300');
      const cCaja = idDe('1100');
      const cPorPagar = idDe('2100');
      if (!cGasto || !cCaja) return;

      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
        { cuentaId: cGasto, debe: bruto, haber: 0, descripcion: 'Salario bruto del período' },
        { cuentaId: cCaja, debe: 0, haber: neto, descripcion: 'Salario neto pagado' },
      ];
      if (retenido > 0 && cPorPagar) {
        lineas.push({ cuentaId: cPorPagar, debe: 0, haber: retenido, descripcion: 'Deducciones retenidas (CCSS/renta)' });
      }

      const fechaPago = recibo.fecha_pago instanceof Date ? recibo.fecha_pago : new Date(recibo.fecha_pago);
      const fechaStr = fechaPago.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

      await this.contabilidadService.crearAsiento(generadoPor as User, {
        fecha: fechaStr,
        descripcion: `Planilla — ${empleado.nombre_completo}`,
        tipo: 'Gasto',
        referencia_id: recibo.id,
        referencia_tipo: 'ReciboPago',
        lineas,
      });
    } catch (e) {
      this.logger.warn(`No se pudo crear el asiento de planilla del recibo #${recibo.id}: ${(e as Error).message}`);
    }
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

    // Revertir el asiento contable generado por este recibo
    let asientosBorrados = 0;
    try {
      asientosBorrados = await this.contabilidadService.eliminarAsientosPorReferencia(
        'ReciboPago',
        id,
      );
    } catch (e) {
      this.logger.warn(`No se pudieron revertir los asientos del recibo #${id}: ${(e as Error).message}`);
    }

    const log = this.auditLogRepository.create({
      usuario: { id: user.id } as User,
      accion: 'ELIMINAR_RECIBO_PAGO',
      detalles: `Recibo ID: ${id}, usuario ID: ${recibo.usuario.id}, salario neto: ${recibo.salario_neto}. Asientos contables revertidos: ${asientosBorrados}.`,
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
