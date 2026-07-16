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

  // ── Balance General clasificado (corriente / no corriente, NIIF) ───────────
  async balanceGeneral(periodo: string, comparar = true): Promise<any> {
    this.validarPeriodo(periodo);
    const armar = async (p: string) => {
      const { hasta } = this.rango(p);
      const bal = await this.contabilidad.getBalance(undefined, hasta);
      const map = (arr: any[]) => arr.map((c) => ({ codigo: c.codigo, nombre: c.nombre, saldo: c.saldo, clasificacion: c.clasificacion_balance ?? null }));
      const suma = (arr: any[]) => +arr.reduce((s, c) => s + (Number(c.saldo) || 0), 0).toFixed(2);

      const activos = map(bal.cuentas.Activo);
      const pasivos = map(bal.cuentas.Pasivo);
      // Los contra-activos (1525, 1590) ya vienen con saldo negativo en Activo → restan
      // dentro de No Corriente automáticamente (activo fijo neto).
      const actCorr = activos.filter((c) => c.clasificacion === 'Corriente');
      const actNoCorr = activos.filter((c) => c.clasificacion !== 'Corriente'); // NoCorriente o sin clasificar
      const pasCorr = pasivos.filter((c) => c.clasificacion === 'Corriente');
      const pasNoCorr = pasivos.filter((c) => c.clasificacion !== 'Corriente');

      const totalActivos = bal.totales.totalActivos;
      const totalPasivos = bal.totales.totalPasivos;
      const patrimonioTotal = +(bal.totales.totalPatrimonio + bal.totales.utilidad).toFixed(2);

      return {
        periodo: p,
        fechaCorte: hasta,
        activo: {
          corriente: actCorr, noCorriente: actNoCorr,
          totalCorriente: suma(actCorr), totalNoCorriente: suma(actNoCorr), total: totalActivos,
        },
        pasivo: {
          corriente: pasCorr, noCorriente: pasNoCorr,
          totalCorriente: suma(pasCorr), totalNoCorriente: suma(pasNoCorr), total: totalPasivos,
        },
        patrimonio: map(bal.cuentas.Patrimonio),
        totales: {
          activos: totalActivos,
          pasivos: totalPasivos,
          patrimonio: patrimonioTotal,
          utilidadEjercicio: bal.totales.utilidad,
          pasivoMasPatrimonio: +(totalPasivos + patrimonioTotal).toFixed(2),
        },
        // Ecuación contable explícita como verificación (Parte F).
        ecuacion: `${totalActivos.toFixed(2)} = ${totalPasivos.toFixed(2)} + ${patrimonioTotal.toFixed(2)}`,
        equilibrado: bal.equilibrado,
      };
    };
    const actual = await armar(periodo);
    const anterior = comparar ? await armar(this.periodoAnterior(periodo)) : null;
    return { tipo: 'Balance General', actual, anterior };
  }

  // ── Flujo de Caja — método indirecto (operación/inversión/financiamiento) ──
  async flujoCaja(periodo: string, comparar = true): Promise<any> {
    this.validarPeriodo(periodo);
    const CUENTA_DEPRECIACION = '5450';

    const armar = async (p: string) => {
      const { desde, hasta } = this.rango(p);
      // Se excluyen los asientos de apertura (cuenta 3900): la carga inicial es la posición
      // de arranque, no flujo de efectivo del período.
      const movs = await this.contabilidad.movimientosPorCuenta(desde, hasta, { excluirApertura: true });
      const round = (n: number) => +Number(n).toFixed(2);

      // Utilidad neta del período (= ingresos − gastos).
      const netIncome = round(
        movs.filter((m) => m.tipo === 'Ingreso').reduce((s, m) => s + m.saldo, 0) -
        movs.filter((m) => m.tipo === 'Gasto').reduce((s, m) => s + m.saldo, 0),
      );
      // Depreciación del período (gasto no monetario) → se suma de vuelta.
      const depreciacion = round(movs.find((m) => m.codigo === CUENTA_DEPRECIACION)?.saldo ?? 0);

      // Efecto en caja de una cuenta de capital de trabajo / balance = −(debe − haber):
      //   ↑ activo operativo = salida; ↑ pasivo operativo = entrada.
      const efecto = (m: any) => round(-m.deltaDebeHaber);

      const wc = movs.filter((m) => m.flujo_categoria === 'Operacion');
      const capitalTrabajo = round(wc.reduce((s, m) => s + efecto(m), 0));
      const flujoOperacion = round(netIncome + depreciacion + capitalTrabajo);

      const inv = movs.filter((m) => m.flujo_categoria === 'Inversion');
      const flujoInversion = round(inv.reduce((s, m) => s + efecto(m), 0));

      const fin = movs.filter((m) => m.flujo_categoria === 'Financiamiento');
      const flujoFinanciamiento = round(fin.reduce((s, m) => s + efecto(m), 0));

      const totalTres = round(flujoOperacion + flujoInversion + flujoFinanciamiento);

      // Validación: variación DIRECTA de las cuentas de efectivo (debe − haber real).
      const cuentasCaja = movs.filter((m) => this.CUENTAS_EFECTIVO.includes(m.codigo));
      const variacionCajaDirecta = round(cuentasCaja.reduce((s, m) => s + m.deltaDebeHaber, 0));
      const diferencia = round(variacionCajaDirecta - totalTres);
      const cuadra = Math.abs(diferencia) < 0.01;

      return {
        periodo: p,
        operacion: {
          items: [
            { concepto: 'Utilidad neta del período', monto: netIncome },
            { concepto: '(+) Depreciación (no monetaria)', monto: depreciacion },
            ...wc.map((m) => ({ concepto: `Δ ${m.codigo} ${m.nombre}`, monto: efecto(m) })),
          ],
          total: flujoOperacion,
        },
        inversion: {
          items: inv.map((m) => ({ concepto: `${m.codigo} ${m.nombre}`, monto: efecto(m) })),
          total: flujoInversion,
        },
        financiamiento: {
          items: fin.map((m) => ({ concepto: `${m.codigo} ${m.nombre}`, monto: efecto(m) })),
          total: flujoFinanciamiento,
        },
        variacionNeta: totalTres,
        variacionCajaDirecta,
        diferencia,
        cuadra,
        efectivoInicial: null as number | null,
      };
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

    // Balance General clasificado (corriente / no corriente)
    const bgRows: any[] = [[`BALANCE GENERAL CLASIFICADO — corte ${bg.actual.fechaCorte}`], [], ['', 'Actual']];
    const grupo = (titulo: string, arr: any[]) => {
      bgRows.push([titulo]);
      for (const c of arr) bgRows.push([`    ${c.codigo} ${c.nombre}`, c.saldo]);
    };
    const a = bg.actual;
    bgRows.push(['ACTIVOS']);
    grupo('  Activo corriente', a.activo.corriente);
    bgRows.push(['  Total activo corriente', a.activo.totalCorriente]);
    grupo('  Activo no corriente', a.activo.noCorriente);
    bgRows.push(['  Total activo no corriente', a.activo.totalNoCorriente]);
    bgRows.push(['TOTAL ACTIVOS', a.activo.total], []);
    bgRows.push(['PASIVOS']);
    grupo('  Pasivo corriente', a.pasivo.corriente);
    bgRows.push(['  Total pasivo corriente', a.pasivo.totalCorriente]);
    grupo('  Pasivo no corriente', a.pasivo.noCorriente);
    bgRows.push(['  Total pasivo no corriente', a.pasivo.totalNoCorriente]);
    bgRows.push(['TOTAL PASIVOS', a.pasivo.total], []);
    grupo('PATRIMONIO', a.patrimonio);
    bgRows.push(['  Utilidad del ejercicio', a.totales.utilidadEjercicio]);
    bgRows.push(['TOTAL PATRIMONIO', a.totales.patrimonio], []);
    bgRows.push(['VERIFICACIÓN — Activo = Pasivo + Patrimonio', a.ecuacion]);
    bgRows.push(['Pasivo + Patrimonio', a.totales.pasivoMasPatrimonio]);
    bgRows.push(['¿Cuadra?', a.equilibrado ? 'SÍ' : 'NO']);
    const wsBG = XLSX.utils.aoa_to_sheet(bgRows);
    wsBG['!cols'] = [{ wch: 44 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsBG, 'Balance General');

    // Flujo de Caja — método indirecto
    const f = fc.actual;
    const fcRows: any[] = [[`FLUJO DE EFECTIVO (MÉTODO INDIRECTO) — ${periodo}`], [], ['Concepto', 'Monto']];
    const seccionFlujo = (titulo: string, s: any) => {
      fcRows.push([titulo]);
      for (const it of s.items) fcRows.push([`    ${it.concepto}`, it.monto]);
      fcRows.push([`  Total ${titulo.toLowerCase()}`, s.total], []);
    };
    seccionFlujo('Actividades de OPERACIÓN', f.operacion);
    seccionFlujo('Actividades de INVERSIÓN', f.inversion);
    seccionFlujo('Actividades de FINANCIAMIENTO', f.financiamiento);
    fcRows.push(['VARIACIÓN NETA DE EFECTIVO (3 secciones)', f.variacionNeta]);
    fcRows.push(['Variación directa de caja (validación)', f.variacionCajaDirecta]);
    fcRows.push(['Diferencia', f.diferencia]);
    fcRows.push(['¿Cuadra?', f.cuadra ? 'SÍ' : 'NO — hay partidas sin clasificar']);
    const wsFC = XLSX.utils.aoa_to_sheet(fcRows);
    wsFC['!cols'] = [{ wch: 46 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsFC, 'Flujo de Caja');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
