import { Injectable, BadRequestException } from '@nestjs/common';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { EstadosFinancierosService } from './estados-financieros.service';

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'na';

interface Figuras {
  periodo: string;
  diasPeriodo: number;
  activoCorriente: number;
  pasivoCorriente: number;
  totalActivos: number;
  totalPasivos: number;
  patrimonio: number;
  inventarios: number;
  cxc: number;
  cxp: number;
  ventas: number;
  costoVentas: number;
  utilidadNeta: number;
}

interface CalcResult { valor: number | null; semaforo: Semaforo; interpretacion: string }

interface IndicadorDef {
  categoria: 'Liquidez' | 'Endeudamiento' | 'Rentabilidad' | 'Actividad';
  nombre: string;
  formula: string;
  unidad: 'ratio' | '%' | 'CRC' | 'días' | 'veces';
  referencia: string;
  favorableSube: boolean;
  calc: (f: Figuras) => CalcResult;
}

const round = (n: number) => +Number(n).toFixed(2);
const NA = (msg = 'Sin datos suficientes (p. ej. aún sin ventas o sin pasivo).'): CalcResult => ({ valor: null, semaforo: 'na', interpretacion: msg });

// Rangos de días para autos (referenciales, revisar con el contador):
//  Inventario: <90 verde, 90–180 amarillo, >180 rojo.
//  Cobro:      <30 verde, 30–60 amarillo, >60 rojo.
//  Pago:       ≤60 verde, 60–90 amarillo, >90 rojo (pagar muy lento = tensión de caja).
//  Ciclo (CCC):<60 verde, 60–120 amarillo, >120 rojo.
const semDiasMenosEsMejor = (v: number, verde: number, amarillo: number): Semaforo =>
  v < verde ? 'verde' : v <= amarillo ? 'amarillo' : 'rojo';

const INDICADORES: IndicadorDef[] = [
  // ── Liquidez ──
  {
    categoria: 'Liquidez', nombre: 'Razón corriente', formula: 'Activo corriente / Pasivo corriente',
    unidad: 'ratio', referencia: '≥1.5 verde · 1.0–1.5 amarillo · <1.0 rojo', favorableSube: true,
    calc: (f) => {
      if (f.pasivoCorriente <= 0) return NA();
      const v = round(f.activoCorriente / f.pasivoCorriente);
      const s: Semaforo = v >= 1.5 ? 'verde' : v >= 1.0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: v >= 1.5 ? 'Buena capacidad de cubrir deudas de corto plazo.' : v >= 1.0 ? 'Cobertura ajustada de las deudas de corto plazo.' : 'No alcanza a cubrir las deudas de corto plazo con el activo corriente.' };
    },
  },
  {
    categoria: 'Liquidez', nombre: 'Prueba ácida', formula: '(Activo corriente − Inventarios) / Pasivo corriente',
    unidad: 'ratio', referencia: '≥1.0 verde · 0.7–1.0 amarillo · <0.7 rojo', favorableSube: true,
    calc: (f) => {
      if (f.pasivoCorriente <= 0) return NA();
      const v = round((f.activoCorriente - f.inventarios) / f.pasivoCorriente);
      const s: Semaforo = v >= 1.0 ? 'verde' : v >= 0.7 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: 'Liquidez sin depender de vender inventario.' };
    },
  },
  {
    categoria: 'Liquidez', nombre: 'Capital de trabajo', formula: 'Activo corriente − Pasivo corriente',
    unidad: 'CRC', referencia: '>0 verde · =0 amarillo · <0 rojo', favorableSube: true,
    calc: (f) => {
      const v = round(f.activoCorriente - f.pasivoCorriente);
      const s: Semaforo = v > 0 ? 'verde' : v === 0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: v >= 0 ? 'Recursos de corto plazo suficientes para operar.' : 'El pasivo corriente supera al activo corriente (déficit de capital de trabajo).' };
    },
  },
  // ── Endeudamiento ──
  {
    categoria: 'Endeudamiento', nombre: 'Razón de endeudamiento', formula: 'Pasivo total / Activo total',
    unidad: 'ratio', referencia: '<0.40 verde · 0.40–0.60 amarillo · >0.60 rojo', favorableSube: false,
    calc: (f) => {
      if (f.totalActivos <= 0) return { valor: null, semaforo: 'rojo', interpretacion: 'Activo total nulo o negativo.' };
      const v = round(f.totalPasivos / f.totalActivos);
      const s: Semaforo = v < 0.4 ? 'verde' : v <= 0.6 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `El ${(v * 100).toFixed(0)}% del activo está financiado con deuda.` };
    },
  },
  {
    categoria: 'Endeudamiento', nombre: 'Deuda / Patrimonio', formula: 'Pasivo total / Patrimonio',
    unidad: 'ratio', referencia: '<1.0 verde · 1.0–2.0 amarillo · >2.0 rojo', favorableSube: false,
    calc: (f) => {
      if (f.patrimonio <= 0) return { valor: null, semaforo: 'rojo', interpretacion: 'Patrimonio negativo/nulo: la empresa depende totalmente de deuda.' };
      const v = round(f.totalPasivos / f.patrimonio);
      const s: Semaforo = v < 1.0 ? 'verde' : v <= 2.0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `Por cada ₡1 de patrimonio hay ₡${v.toFixed(2)} de deuda.` };
    },
  },
  {
    categoria: 'Endeudamiento', nombre: 'Solvencia patrimonial', formula: 'Patrimonio / Activo total',
    unidad: 'ratio', referencia: '>0.50 verde · 0.30–0.50 amarillo · <0.30 rojo', favorableSube: true,
    calc: (f) => {
      if (f.patrimonio <= 0) return { valor: null, semaforo: 'rojo', interpretacion: 'Patrimonio negativo/nulo.' };
      if (f.totalActivos <= 0) return { valor: null, semaforo: 'rojo', interpretacion: 'Activo total nulo o negativo.' };
      const v = round(f.patrimonio / f.totalActivos);
      const s: Semaforo = v > 0.5 ? 'verde' : v >= 0.3 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `El ${(v * 100).toFixed(0)}% del activo es propio (patrimonio).` };
    },
  },
  // ── Rentabilidad ──
  {
    categoria: 'Rentabilidad', nombre: 'Margen bruto', formula: '(Ventas − Costo de ventas) / Ventas',
    unidad: '%', referencia: '>15% verde · 5–15% amarillo · <5% rojo', favorableSube: true,
    calc: (f) => {
      if (f.ventas <= 0) return NA('Sin ventas registradas en el período.');
      const v = round(((f.ventas - f.costoVentas) / f.ventas) * 100);
      const s: Semaforo = v > 15 ? 'verde' : v >= 5 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `Deja ${v.toFixed(1)}% sobre ventas después del costo directo.` };
    },
  },
  {
    categoria: 'Rentabilidad', nombre: 'Margen neto', formula: 'Utilidad neta / Ventas',
    unidad: '%', referencia: '>5% verde · 0–5% amarillo · <0 rojo', favorableSube: true,
    calc: (f) => {
      if (f.ventas <= 0) return NA('Sin ventas registradas en el período.');
      const v = round((f.utilidadNeta / f.ventas) * 100);
      const s: Semaforo = v > 5 ? 'verde' : v >= 0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: v >= 0 ? `Gana ${v.toFixed(1)}% neto sobre ventas.` : `Pierde ${Math.abs(v).toFixed(1)}% sobre ventas.` };
    },
  },
  {
    categoria: 'Rentabilidad', nombre: 'ROA (del período)', formula: 'Utilidad neta / Activo total',
    unidad: '%', referencia: '>0 verde · <0 rojo', favorableSube: true,
    calc: (f) => {
      if (f.totalActivos <= 0) return NA();
      const v = round((f.utilidadNeta / f.totalActivos) * 100);
      const s: Semaforo = v > 0 ? 'verde' : v === 0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `Rendimiento del activo en el período: ${v.toFixed(1)}%.` };
    },
  },
  {
    categoria: 'Rentabilidad', nombre: 'ROE (del período)', formula: 'Utilidad neta / Patrimonio',
    unidad: '%', referencia: '>0 verde · <0 rojo', favorableSube: true,
    calc: (f) => {
      if (f.patrimonio <= 0) return { valor: null, semaforo: 'rojo', interpretacion: 'Patrimonio negativo/nulo: ROE no interpretable.' };
      const v = round((f.utilidadNeta / f.patrimonio) * 100);
      const s: Semaforo = v > 0 ? 'verde' : v === 0 ? 'amarillo' : 'rojo';
      return { valor: v, semaforo: s, interpretacion: `Rendimiento del patrimonio en el período: ${v.toFixed(1)}%.` };
    },
  },
  // ── Actividad (rotaciones informativas: semáforo na; los días llevan el semáforo) ──
  {
    categoria: 'Actividad', nombre: 'Rotación de inventario', formula: 'Costo de ventas / Inventario final',
    unidad: 'veces', referencia: 'Informativo (más alto = más movimiento)', favorableSube: true,
    calc: (f) => (f.inventarios <= 0 || f.costoVentas <= 0 ? NA() : { valor: round(f.costoVentas / f.inventarios), semaforo: 'na', interpretacion: 'Veces que rotó el inventario en el período.' }),
  },
  {
    categoria: 'Actividad', nombre: 'Días de inventario', formula: 'Días período / rotación inventario',
    unidad: 'días', referencia: '<90 verde · 90–180 amarillo · >180 rojo', favorableSube: false,
    calc: (f) => {
      if (f.inventarios <= 0 || f.costoVentas <= 0) return NA();
      const v = round(f.diasPeriodo / (f.costoVentas / f.inventarios));
      return { valor: v, semaforo: semDiasMenosEsMejor(v, 90, 180), interpretacion: `El inventario tarda ~${v.toFixed(0)} días en venderse.` };
    },
  },
  {
    categoria: 'Actividad', nombre: 'Período promedio de cobro', formula: 'Días período / (Ventas / CxC)',
    unidad: 'días', referencia: '<30 verde · 30–60 amarillo · >60 rojo', favorableSube: false,
    calc: (f) => {
      if (f.cxc <= 0 || f.ventas <= 0) return NA();
      const v = round(f.diasPeriodo / (f.ventas / f.cxc));
      return { valor: v, semaforo: semDiasMenosEsMejor(v, 30, 60), interpretacion: `Se tarda ~${v.toFixed(0)} días en cobrar.` };
    },
  },
  {
    categoria: 'Actividad', nombre: 'Período promedio de pago', formula: 'Días período / (Costo de ventas / CxP)',
    unidad: 'días', referencia: '≤60 verde · 60–90 amarillo · >90 rojo', favorableSube: false,
    calc: (f) => {
      if (f.cxp <= 0 || f.costoVentas <= 0) return NA();
      const v = round(f.diasPeriodo / (f.costoVentas / f.cxp));
      return { valor: v, semaforo: semDiasMenosEsMejor(v, 60, 90), interpretacion: `Se tarda ~${v.toFixed(0)} días en pagar a proveedores.` };
    },
  },
  {
    categoria: 'Actividad', nombre: 'Ciclo de conversión de efectivo', formula: 'Días inventario + días cobro − días pago',
    unidad: 'días', referencia: '<60 verde · 60–120 amarillo · >120 rojo', favorableSube: false,
    calc: (f) => {
      const rot = (num: number, den: number) => (den <= 0 || num <= 0 ? null : f.diasPeriodo / (num / den));
      const di = rot(f.costoVentas, f.inventarios);
      const dc = rot(f.ventas, f.cxc);
      const dp = rot(f.costoVentas, f.cxp);
      if (di == null && dc == null && dp == null) return NA();
      const v = round((di ?? 0) + (dc ?? 0) - (dp ?? 0));
      return { valor: v, semaforo: semDiasMenosEsMejor(v, 60, 120), interpretacion: `Días entre pagar insumos y cobrar la venta: ~${v.toFixed(0)}.` };
    },
  },
];

@Injectable()
export class SaludFinancieraService {
  constructor(
    private readonly contabilidad: ContabilidadService,
    private readonly estados: EstadosFinancierosService,
  ) {}

  private validar(p: string) {
    if (!/^\d{4}-\d{2}$/.test(p)) throw new BadRequestException("El período debe ser 'YYYY-MM'.");
  }
  private periodoAnterior(p: string): string {
    const [y, m] = p.split('-').map(Number);
    return new Date(y, m - 2, 1).toISOString().slice(0, 7);
  }

  private async figuras(periodo: string): Promise<Figuras> {
    const [y, m] = periodo.split('-').map(Number);
    const diasPeriodo = new Date(y, m, 0).getDate();
    const desde = `${periodo}-01`;
    const hasta = new Date(y, m, 0).toLocaleDateString('en-CA');

    const bg = await this.estados.balanceGeneral(periodo, false);
    const bal = await this.contabilidad.getBalance(undefined, hasta);
    const movs = await this.contabilidad.movimientosPorCuenta(desde, hasta);

    const saldoCod = (codigo: string): number => {
      for (const tipo of Object.keys(bal.cuentas)) {
        const c = (bal.cuentas[tipo] as any[]).find((x) => x.codigo === codigo);
        if (c) return Number(c.saldo) || 0;
      }
      return 0;
    };
    const periodoCod = (codigos: string[]): number =>
      movs.filter((mv: any) => codigos.includes(mv.codigo)).reduce((s: number, mv: any) => s + (Number(mv.saldo) || 0), 0);
    const sumTipo = (tipo: string) => movs.filter((mv: any) => mv.tipo === tipo).reduce((s: number, mv: any) => s + (Number(mv.saldo) || 0), 0);

    const a = bg.actual;
    return {
      periodo,
      diasPeriodo,
      activoCorriente: a.activo.totalCorriente,
      pasivoCorriente: a.pasivo.totalCorriente,
      totalActivos: a.totales.activos,
      totalPasivos: a.totales.pasivos,
      patrimonio: a.totales.patrimonio,
      inventarios: round(saldoCod('1300') + saldoCod('1400')),
      cxc: saldoCod('1200'),
      cxp: saldoCod('2100'),
      ventas: round(periodoCod(['4100', '4200'])),
      costoVentas: round(periodoCod(['5100', '5200'])),
      utilidadNeta: round(sumTipo('Ingreso') - sumTipo('Gasto')),
    };
  }

  async analizar(periodo: string, comparar = true): Promise<any> {
    this.validar(periodo);
    const figAct = await this.figuras(periodo);
    const figAnt = comparar ? await this.figuras(this.periodoAnterior(periodo)) : null;

    const indicadores = INDICADORES.map((def) => {
      const act = def.calc(figAct);
      const ant = figAnt ? def.calc(figAnt) : { valor: null };
      let tendencia: 'mejora' | 'empeora' | 'estable' = 'estable';
      if (act.valor != null && ant.valor != null) {
        const d = round(act.valor - ant.valor);
        if (Math.abs(d) < 0.01) tendencia = 'estable';
        else tendencia = (d > 0) === def.favorableSube ? 'mejora' : 'empeora';
      }
      return {
        categoria: def.categoria, nombre: def.nombre, formula: def.formula, unidad: def.unidad,
        valor: act.valor, semaforo: act.semaforo, interpretacion: act.interpretacion, referencia: def.referencia,
        actual: act.valor, anterior: ant.valor ?? null, tendencia,
      };
    });

    return { periodo, figuras: figAct, indicadores, diagnostico: this.diagnostico(indicadores, figAct) };
  }

  private diagnostico(indicadores: any[], f: Figuras): any {
    const puntos = indicadores
      .filter((i) => i.semaforo !== 'na')
      .map((i) => (i.semaforo === 'verde' ? 2 : i.semaforo === 'amarillo' ? 1 : 0));
    const puntaje = puntos.length ? round(puntos.reduce((s, p) => s + p, 0) / puntos.length) : 0;
    const semaforoGlobal: Semaforo = puntos.length === 0 ? 'na' : puntaje >= 1.5 ? 'verde' : puntaje >= 0.8 ? 'amarillo' : 'rojo';

    const fortalezas = indicadores.filter((i) => i.semaforo === 'verde').map((i) => `${i.nombre}: ${i.interpretacion}`);
    const riesgos = indicadores.filter((i) => i.semaforo === 'rojo').map((i) => `${i.nombre}: ${i.interpretacion}`);

    let contexto: string;
    if (f.ventas <= 0) contexto = 'Empresa en etapa pre-operativa: sin ventas registradas en el período; los indicadores de rentabilidad y actividad no aplican todavía.';
    else if (f.utilidadNeta < 0) contexto = 'La empresa operó con pérdidas en el período.';
    else contexto = 'La empresa operó con utilidad en el período.';

    const resumen = `${contexto} ${fortalezas.length} indicador(es) en verde y ${riesgos.length} en rojo. ` +
      (semaforoGlobal === 'verde' ? 'Salud financiera general buena.' : semaforoGlobal === 'amarillo' ? 'Salud financiera general con puntos de atención.' : semaforoGlobal === 'rojo' ? 'Salud financiera general delicada; atender los riesgos listados.' : 'Datos insuficientes para un diagnóstico general.');

    return { semaforoGlobal, puntaje, fortalezas, riesgos, resumen };
  }
}
