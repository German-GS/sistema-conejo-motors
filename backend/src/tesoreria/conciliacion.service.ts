import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { MovimientoBancario } from './movimiento-bancario.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { User } from '../users/user.entity';

const ENTRADAS = ['Deposito', 'Transferencia Entrada', 'Cobro'];

@Injectable()
export class ConciliacionService {
  constructor(
    @InjectRepository(CuentaBancaria) private cuentasRepo: Repository<CuentaBancaria>,
    @InjectRepository(MovimientoBancario) private movRepo: Repository<MovimientoBancario>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  /** Monto firmado del movimiento bancario: + entrada, − salida. */
  private signo(m: MovimientoBancario): number {
    const abs = Math.abs(Number(m.monto) || 0);
    return ENTRADAS.includes(m.tipo) ? abs : -abs;
  }

  private async getCuenta(id: number): Promise<CuentaBancaria> {
    const c = await this.cuentasRepo.findOneBy({ id });
    if (!c) throw new NotFoundException(`Cuenta bancaria #${id} no encontrada.`);
    return c;
  }

  /**
   * Importa el estado de cuenta (CSV: fecha,descripcion,monto,referencia — monto firmado:
   * + entrada / − salida). Devuelve cuántas filas se importaron.
   */
  async importarCSV(cuentaId: number, csv: string): Promise<{ importados: number }> {
    const cuenta = await this.getCuenta(cuentaId);
    const lineas = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Saltar encabezado si la primera columna no es una fecha.
    if (lineas.length && !/^\d{4}-\d{2}-\d{2}/.test(lineas[0])) lineas.shift();

    let importados = 0;
    for (const l of lineas) {
      const cols = l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      const [fecha, descripcion, montoRaw, referencia] = cols;
      if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
      const monto = Number(String(montoRaw).replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(monto) || monto === 0) continue;
      await this.movRepo.save(this.movRepo.create({
        cuenta,
        tipo: monto >= 0 ? 'Deposito' : 'Retiro',
        monto: Math.abs(monto),
        descripcion: descripcion || 'Movimiento importado',
        fecha: fecha.slice(0, 10),
        referencia: referencia || undefined,
        origen: 'Importado',
        conciliado: false,
      }));
      importados++;
    }
    return { importados };
  }

  /**
   * Concilia automáticamente: casa cada movimiento bancario no conciliado contra una
   * línea del mayor de la cuenta contable por monto (firmado) + fecha (± tolerancia días).
   */
  async conciliar(cuentaId: number, desde: string, hasta: string, toleranciaDias = 3): Promise<any> {
    const cuenta = await this.getCuenta(cuentaId);
    const bancarios = await this.movRepo.find({
      where: { cuenta: { id: cuentaId }, conciliado: false, fecha: Between(desde, hasta) as any },
      order: { fecha: 'ASC' },
    });
    const ledger = await this.contabilidad.lineasDeCuenta(cuenta.cuenta_contable, desde, hasta);

    // Líneas del mayor ya usadas en conciliaciones previas de esta cuenta.
    const usadas = new Set<number>(
      (await this.movRepo.find({ where: { cuenta: { id: cuentaId }, asiento_linea_id: Not(IsNull()) } }))
        .map((m) => m.asiento_linea_id!)
        .filter(Boolean),
    );

    let conciliados = 0;
    for (const b of bancarios) {
      const signo = this.signo(b);
      const bt = new Date(b.fecha).getTime();
      const match = ledger.find((l) =>
        !usadas.has(l.lineaId) &&
        Math.abs(l.monto - signo) < 0.01 &&
        Math.abs(new Date(l.fecha).getTime() - bt) <= toleranciaDias * 86400000,
      );
      if (match) {
        b.conciliado = true;
        b.asiento_linea_id = match.lineaId;
        await this.movRepo.save(b);
        usadas.add(match.lineaId);
        conciliados++;
      }
    }
    return { conciliados, ...(await this.reporte(cuentaId, desde, hasta)) };
  }

  /** Reporte de conciliación: saldo libros vs. banco + partidas conciliatorias. */
  async reporte(cuentaId: number, desde: string, hasta: string): Promise<any> {
    const cuenta = await this.getCuenta(cuentaId);
    const ledger = await this.contabilidad.lineasDeCuenta(cuenta.cuenta_contable, desde, hasta);
    const bancarios = await this.movRepo.find({
      where: { cuenta: { id: cuentaId }, fecha: Between(desde, hasta) as any },
      order: { fecha: 'ASC' },
    });

    const usadas = new Set<number>(bancarios.filter((m) => m.asiento_linea_id).map((m) => m.asiento_linea_id!));
    const enLibrosNoEnBanco = ledger
      .filter((l) => !usadas.has(l.lineaId))
      .map((l) => ({ lineaId: l.lineaId, asientoId: l.asientoId, fecha: l.fecha, descripcion: l.descripcion, monto: l.monto }));
    const enBancoNoEnLibros = bancarios
      .filter((m) => !m.conciliado)
      .map((m) => ({ id: m.id, fecha: m.fecha, descripcion: m.descripcion, tipo: m.tipo, monto: this.signo(m), referencia: m.referencia }));

    const round = (n: number) => +n.toFixed(2);
    // Saldo según libros = saldo contable de la cuenta a la fecha de corte.
    const bal = await this.contabilidad.getBalance(undefined, hasta);
    const cuentaLibro = (bal.cuentas.Activo as any[]).find((c) => c.codigo === cuenta.cuenta_contable);
    const saldoLibros = round(cuentaLibro?.saldo ?? 0);
    const partidasLibrosNoBanco = round(enLibrosNoEnBanco.reduce((s, l) => s + l.monto, 0));
    const partidasBancoNoLibros = round(enBancoNoEnLibros.reduce((s, m) => s + m.monto, 0));
    // Saldo banco teórico = libros − (en libros no en banco) + (en banco no en libros).
    const saldoBanco = round(saldoLibros - partidasLibrosNoBanco + partidasBancoNoLibros);

    return {
      cuenta: { id: cuenta.id, banco: cuenta.banco, numero: cuenta.numero_cuenta, cuentaContable: cuenta.cuenta_contable, moneda: cuenta.moneda },
      periodo: { desde, hasta },
      saldoLibros,
      enLibrosNoEnBanco,
      enBancoNoEnLibros,
      partidasLibrosNoBanco,
      partidasBancoNoLibros,
      saldoBanco,
      totalConciliadas: bancarios.filter((m) => m.conciliado).length,
    };
  }

  /**
   * Crea el asiento faltante para un movimiento "en banco no en libros" (comisión, interés).
   * Salida (comisión) → Debe 5600 / Haber banco. Entrada (interés) → Debe banco / Haber 4300.
   */
  async crearAsientoAjuste(movimientoId: number, user: User, cuentaGasto = '5600'): Promise<MovimientoBancario> {
    const mov = await this.movRepo.findOne({ where: { id: movimientoId }, relations: ['cuenta'] });
    if (!mov) throw new NotFoundException(`Movimiento #${movimientoId} no encontrado.`);
    if (mov.conciliado) throw new BadRequestException('El movimiento ya está conciliado.');

    const signo = this.signo(mov);
    const abs = Math.abs(signo);
    const cBanco = await this.contabilidad.asegurarCuenta(mov.cuenta.cuenta_contable, { nombre: `Banco ${mov.cuenta.banco}`, tipo: 'Activo' });

    let lineas;
    if (signo < 0) {
      // Salida del banco → gasto (comisión/cargo bancario).
      const cGasto = await this.contabilidad.asegurarCuenta(cuentaGasto, { nombre: 'Gastos Financieros', tipo: 'Gasto' });
      lineas = [
        { cuentaId: cGasto.id, debe: abs, haber: 0, descripcion: mov.descripcion },
        { cuentaId: cBanco.id, debe: 0, haber: abs, descripcion: `Cargo banco — ${mov.descripcion}` },
      ];
    } else {
      // Entrada al banco → ingreso (intereses ganados).
      const cIngreso = await this.contabilidad.asegurarCuenta('4300', { nombre: 'Otros Ingresos', tipo: 'Ingreso' });
      lineas = [
        { cuentaId: cBanco.id, debe: abs, haber: 0, descripcion: mov.descripcion },
        { cuentaId: cIngreso.id, debe: 0, haber: abs, descripcion: `Abono banco — ${mov.descripcion}` },
      ];
    }

    await this.contabilidad.crearAsiento(user, {
      fecha: mov.fecha,
      descripcion: `Conciliación bancaria — ${mov.descripcion}`,
      tipo: 'Ajuste',
      referencia_tipo: 'ConciliacionBancaria',
      referencia_id: mov.id,
      lineas,
    });
    mov.conciliado = true;
    return this.movRepo.save(mov);
  }
}
