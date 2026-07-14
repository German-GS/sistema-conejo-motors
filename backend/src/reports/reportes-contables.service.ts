import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as XLSX from 'xlsx';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CuentaPagar } from '../cxp/cuenta-pagar.entity';

// Tramos de antigüedad (aging) en días.
const TRAMOS = ['Corriente', '1-30', '31-60', '61-90', '+90'] as const;
type Tramo = (typeof TRAMOS)[number];

@Injectable()
export class ReportesContablesService {
  constructor(
    private readonly contabilidad: ContabilidadService,
    @InjectRepository(CuentaCobrar) private cxcRepo: Repository<CuentaCobrar>,
    @InjectRepository(CuentaPagar) private cxpRepo: Repository<CuentaPagar>,
  ) {}

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  }

  private tramoDe(fechaVenc: string, ref: string): Tramo {
    const dias = Math.floor((new Date(ref).getTime() - new Date(fechaVenc).getTime()) / 86400000);
    if (dias <= 0) return 'Corriente';
    if (dias <= 30) return '1-30';
    if (dias <= 60) return '31-60';
    if (dias <= 90) return '61-90';
    return '+90';
  }

  // ── Antigüedad de saldos (aging) ───────────────────────────────────────────
  async aging(tipo: 'cxc' | 'cxp', ref?: string): Promise<any> {
    const fechaRef = ref || this.hoy();
    const repo: Repository<any> = tipo === 'cxc' ? this.cxcRepo : this.cxpRepo;
    const rel = tipo === 'cxc' ? 'cliente' : 'proveedor';
    // Se filtran por saldo pendiente (>0) en el loop; solo se excluyen las anuladas.
    const filas = await repo.find({
      where: { estado: Not('Anulado') as any },
      relations: [rel],
    });

    const porEntidad = new Map<string, { entidad: string; tramos: Record<Tramo, number>; total: number }>();
    const totales: Record<Tramo, number> = { Corriente: 0, '1-30': 0, '31-60': 0, '61-90': 0, '+90': 0 };
    let totalGeneral = 0;

    for (const f of filas) {
      const saldo = Number(f.saldo_pendiente) || 0;
      if (saldo <= 0) continue;
      const nombre = (f[rel]?.nombre_completo || f[rel]?.nombre || f[rel]?.razon_social || 'Sin asignar') as string;
      const tramo = this.tramoDe(f.fecha_vencimiento, fechaRef);
      if (!porEntidad.has(nombre)) porEntidad.set(nombre, { entidad: nombre, tramos: { Corriente: 0, '1-30': 0, '31-60': 0, '61-90': 0, '+90': 0 }, total: 0 });
      const e = porEntidad.get(nombre)!;
      e.tramos[tramo] += saldo; e.total += saldo;
      totales[tramo] += saldo; totalGeneral += saldo;
    }

    const round = (n: number) => +n.toFixed(2);
    const entidades = [...porEntidad.values()]
      .map((e) => ({ entidad: e.entidad, tramos: Object.fromEntries(TRAMOS.map((t) => [t, round(e.tramos[t])])), total: round(e.total) }))
      .sort((a, b) => b.total - a.total);

    return {
      tipo, fechaRef, tramos: TRAMOS,
      entidades,
      totales: Object.fromEntries(TRAMOS.map((t) => [t, round(totales[t])])),
      totalGeneral: round(totalGeneral),
    };
  }

  // ── Exports a Excel ────────────────────────────────────────────────────────
  async balanzaExcel(hasta?: string): Promise<Buffer> {
    const b = await this.contabilidad.balanzaComprobacion(hasta);
    const rows: any[] = [[`BALANZA DE COMPROBACIÓN — al ${b.hasta}`], [], ['Código', 'Cuenta', 'Tipo', 'Débitos', 'Créditos', 'Saldo deudor', 'Saldo acreedor']];
    for (const c of b.cuentas) rows.push([c.codigo, c.nombre, c.tipo, c.debe, c.haber, c.saldoDeudor, c.saldoAcreedor]);
    rows.push(['', 'TOTALES', '', b.totales.debe, b.totales.haber, b.totales.saldoDeudor, b.totales.saldoAcreedor]);
    rows.push(['', b.cuadra ? '✓ Cuadra (deudores = acreedores)' : '⚠️ NO cuadra']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balanza');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async libroMayorExcel(codigo: string, desde: string, hasta: string): Promise<Buffer> {
    const m = await this.contabilidad.libroMayor(codigo, desde, hasta);
    const rows: any[] = [
      [`LIBRO MAYOR — ${m.cuenta.codigo} ${m.cuenta.nombre} (${m.desde} a ${m.hasta})`], [],
      ['Fecha', 'Asiento', 'Descripción', 'Detalle', 'Debe', 'Haber', 'Saldo'],
      ['', '', 'Saldo inicial', '', '', '', m.saldoInicial],
    ];
    for (const l of m.movimientos) rows.push([l.fecha, l.asiento, l.descripcion, l.detalle, l.debe, l.haber, l.saldo]);
    rows.push(['', '', 'SALDO FINAL', '', '', '', m.saldoFinal]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 34 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Mayor ${codigo}`);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async libroDiarioExcel(desde: string, hasta: string): Promise<Buffer> {
    const asientos = await this.contabilidad.getAsientos(desde, hasta);
    const rows: any[] = [[`LIBRO DIARIO — ${desde} a ${hasta}`], [], ['Fecha', 'Asiento', 'Tipo', 'Cuenta', 'Descripción', 'Debe', 'Haber']];
    for (const a of asientos) {
      for (const l of a.lineas ?? []) {
        rows.push([a.fecha, a.id, a.tipo, `${l.cuenta?.codigo ?? ''} ${l.cuenta?.nombre ?? ''}`, l.descripcion ?? a.descripcion, Number(l.debe) || 0, Number(l.haber) || 0]);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 16 }, { wch: 34 }, { wch: 34 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Libro Diario');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async agingExcel(tipo: 'cxc' | 'cxp', ref?: string): Promise<Buffer> {
    const a = await this.aging(tipo, ref);
    const titulo = tipo === 'cxc' ? 'ANTIGÜEDAD DE CUENTAS POR COBRAR' : 'ANTIGÜEDAD DE CUENTAS POR PAGAR';
    const rows: any[] = [[`${titulo} — al ${a.fechaRef}`], [], [tipo === 'cxc' ? 'Cliente' : 'Proveedor', ...a.tramos, 'Total']];
    for (const e of a.entidades) rows.push([e.entidad, ...a.tramos.map((t: string) => e.tramos[t]), e.total]);
    rows.push(['TOTALES', ...a.tramos.map((t: string) => a.totales[t]), a.totalGeneral]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 34 }, ...a.tramos.map(() => ({ wch: 14 })), { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === 'cxc' ? 'Aging CxC' : 'Aging CxP');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
