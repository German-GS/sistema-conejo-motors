import { Injectable, BadRequestException } from '@nestjs/common';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import * as XLSX from 'xlsx';

/**
 * Estados financieros formales por período, reutilizando el motor contable:
 *  - Estado de Resultados (P&L): ingresos − gastos del período.
 *  - Balance General: saldos acumulados de Activo/Pasivo/Patrimonio a la fecha de corte.
 *  - Flujo de Caja: variación de las cuentas de efectivo/banco en el período.
 * Todos con comparativo período-a-período. Exportables a Excel.
 */
@Injectable()
export class EstadosFinancierosService {
  // Cuentas de efectivo y equivalentes para el flujo de caja.
  private readonly CUENTAS_EFECTIVO = ['1100', '1110', '1120'];

  constructor(private readonly contabilidad: ContabilidadService) {}

  private validarPeriodo(p: string) {
    if (!/^\d{4}-\d{2}$/.test(p)) throw new BadRequestException("El período debe ser 'YYYY-MM'.");
  }

  private rango(periodo: string): { desde: string; hasta: string } {
    const [y, m] = periodo.split('-').map(Number);
    const desde = `${periodo}-01`;
    const hasta = new Date(y, m, 0).toLocaleDateString('en-CA');
    return { desde, hasta };
  }

  private periodoAnterior(periodo: string): string {
    const [y, m] = periodo.split('-').map(Number);
    return new Date(y, m - 2, 1).toISOString().slice(0, 7);
  }

  // ── Estado de Resultados ───────────────────────────────────────────────────
  async estadoResultados(periodo: string, comparar = true): Promise<any> {
    this.validarPeriodo(periodo);
    const armar = async (p: string) => {
      const { desde, hasta } = this.rango(p);
      const movs = await this.contabilidad.movimientosPorCuenta(desde, hasta);
      const ingresos = movs.filter((m) => m.tipo === 'Ingreso').map((m) => ({ codigo: m.codigo, nombre: m.nombre, monto: m.saldo }));
      const gastos = movs.filter((m) => m.tipo === 'Gasto').map((m) => ({ codigo: m.codigo, nombre: m.nombre, monto: m.saldo }));
      const totalIngresos = +ingresos.reduce((s, i) => s + i.monto, 0).toFixed(2);
      const totalGastos = +gastos.reduce((s, g) => s + g.monto, 0).toFixed(2);
      return { periodo: p, ingresos, gastos, totalIngresos, totalGastos, utilidadNeta: +(totalIngresos - totalGastos).toFixed(2) };
    };
    const actual = await armar(periodo);
    const anterior = comparar ? await armar(this.periodoAnterior(periodo)) : null;
    return { tipo: 'Estado de Resultados', actual, anterior };
  }

  // ── Balance General ────────────────────────────────────────────────────────
  async balanceGeneral(periodo: string, comparar = true): Promise<any> {
    this.validarPeriodo(periodo);
    const armar = async (p: string) => {
      const { hasta } = this.rango(p);
      const bal = await this.contabilidad.getBalance(undefined, hasta);
      const map = (arr: any[]) => arr.map((c) => ({ codigo: c.codigo, nombre: c.nombre, saldo: c.saldo }));
      return {
        periodo: p,
        fechaCorte: hasta,
        activos: map(bal.cuentas.Activo),
        pasivos: map(bal.cuentas.Pasivo),
        patrimonio: map(bal.cuentas.Patrimonio),
        totales: {
          activos: bal.totales.totalActivos,
          pasivos: bal.totales.totalPasivos,
          // El patrimonio incluye la utilidad acumulada del ejercicio.
          patrimonio: +(bal.totales.totalPatrimonio + bal.totales.utilidad).toFixed(2),
          utilidadEjercicio: bal.totales.utilidad,
        },
        equilibrado: bal.equilibrado,
      };
    };
    const actual = await armar(periodo);
    const anterior = comparar ? await armar(this.periodoAnterior(periodo)) : null;
    return { tipo: 'Balance General', actual, anterior };
  }

  // ── Flujo de Caja ──────────────────────────────────────────────────────────
  async flujoCaja(periodo: string, comparar = true): Promise<any> {
    this.validarPeriodo(periodo);
    const armar = async (p: string) => {
      const { desde, hasta } = this.rango(p);
      const movs = await this.contabilidad.movimientosPorCuenta(desde, hasta);
      const cuentasCaja = movs.filter((m) => this.CUENTAS_EFECTIVO.includes(m.codigo));
      // saldo del período para una cuenta de Activo = debe − haber = entradas netas.
      const detalle = cuentasCaja.map((c) => ({ codigo: c.codigo, nombre: c.nombre, variacion: c.saldo }));
      const variacionNeta = +detalle.reduce((s, c) => s + c.variacion, 0).toFixed(2);
      return { periodo: p, detalle, variacionNeta };
    };
    const actual = await armar(periodo);
    const anterior = comparar ? await armar(this.periodoAnterior(periodo)) : null;
    return { tipo: 'Flujo de Caja', actual, anterior };
  }

  // ── Export a Excel (las tres, con comparativo) ─────────────────────────────
  async excel(periodo: string): Promise<Buffer> {
    const [er, bg, fc] = await Promise.all([
      this.estadoResultados(periodo, true),
      this.balanceGeneral(periodo, true),
      this.flujoCaja(periodo, true),
    ]);
    const wb = XLSX.utils.book_new();
    const delta = (a: number, b: number | undefined) => (b === undefined || b === null ? '' : +(a - b).toFixed(2));

    // Estado de Resultados
    const erRows: any[] = [[`ESTADO DE RESULTADOS — ${periodo}`], [], ['', 'Actual', 'Anterior', 'Δ']];
    erRows.push(['INGRESOS']);
    for (const i of er.actual.ingresos) {
      const prev = er.anterior?.ingresos.find((x: any) => x.codigo === i.codigo)?.monto;
      erRows.push([`  ${i.codigo} ${i.nombre}`, i.monto, prev ?? '', delta(i.monto, prev)]);
    }
    erRows.push(['Total Ingresos', er.actual.totalIngresos, er.anterior?.totalIngresos ?? '', delta(er.actual.totalIngresos, er.anterior?.totalIngresos)]);
    erRows.push(['GASTOS']);
    for (const g of er.actual.gastos) {
      const prev = er.anterior?.gastos.find((x: any) => x.codigo === g.codigo)?.monto;
      erRows.push([`  ${g.codigo} ${g.nombre}`, g.monto, prev ?? '', delta(g.monto, prev)]);
    }
    erRows.push(['Total Gastos', er.actual.totalGastos, er.anterior?.totalGastos ?? '', delta(er.actual.totalGastos, er.anterior?.totalGastos)]);
    erRows.push(['UTILIDAD NETA', er.actual.utilidadNeta, er.anterior?.utilidadNeta ?? '', delta(er.actual.utilidadNeta, er.anterior?.utilidadNeta)]);
    const wsER = XLSX.utils.aoa_to_sheet(erRows);
    wsER['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsER, 'Estado de Resultados');

    // Balance General
    const bgRows: any[] = [[`BALANCE GENERAL — corte ${bg.actual.fechaCorte}`], [], ['', 'Actual', 'Anterior']];
    const secc = (titulo: string, arr: any[], prevArr: any[] | undefined) => {
      bgRows.push([titulo]);
      for (const c of arr) {
        const prev = prevArr?.find((x: any) => x.codigo === c.codigo)?.saldo;
        bgRows.push([`  ${c.codigo} ${c.nombre}`, c.saldo, prev ?? '']);
      }
    };
    secc('ACTIVOS', bg.actual.activos, bg.anterior?.activos);
    bgRows.push(['Total Activos', bg.actual.totales.activos, bg.anterior?.totales.activos ?? '']);
    secc('PASIVOS', bg.actual.pasivos, bg.anterior?.pasivos);
    bgRows.push(['Total Pasivos', bg.actual.totales.pasivos, bg.anterior?.totales.pasivos ?? '']);
    secc('PATRIMONIO', bg.actual.patrimonio, bg.anterior?.patrimonio);
    bgRows.push(['Utilidad del ejercicio', bg.actual.totales.utilidadEjercicio, bg.anterior?.totales.utilidadEjercicio ?? '']);
    bgRows.push(['Total Patrimonio', bg.actual.totales.patrimonio, bg.anterior?.totales.patrimonio ?? '']);
    const wsBG = XLSX.utils.aoa_to_sheet(bgRows);
    wsBG['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsBG, 'Balance General');

    // Flujo de Caja
    const fcRows: any[] = [[`FLUJO DE CAJA — ${periodo}`], [], ['Cuenta', 'Actual', 'Anterior']];
    for (const c of fc.actual.detalle) {
      const prev = fc.anterior?.detalle.find((x: any) => x.codigo === c.codigo)?.variacion;
      fcRows.push([`${c.codigo} ${c.nombre}`, c.variacion, prev ?? '']);
    }
    fcRows.push(['VARIACIÓN NETA DE EFECTIVO', fc.actual.variacionNeta, fc.anterior?.variacionNeta ?? '']);
    const wsFC = XLSX.utils.aoa_to_sheet(fcRows);
    wsFC['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsFC, 'Flujo de Caja');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
