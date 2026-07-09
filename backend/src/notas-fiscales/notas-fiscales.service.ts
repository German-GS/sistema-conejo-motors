import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotaFiscal } from './nota-fiscal.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { User } from '../users/user.entity';

interface CrearNotaDto {
  tipo: 'Credito' | 'Debito';
  naturaleza: 'Venta' | 'Compra';
  fecha?: string;
  base: number;
  iva?: number;
  iva_tarifa?: string;
  documento_ref?: string;
  motivo?: string;
}

@Injectable()
export class NotasFiscalesService {
  constructor(
    @InjectRepository(NotaFiscal) private repo: Repository<NotaFiscal>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  private hoyCR(): string { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }); }

  listar(): Promise<NotaFiscal[]> {
    return this.repo.find({ relations: ['creado_por'], order: { fecha: 'DESC' } });
  }

  listarPeriodo(desde: string, hasta: string): Promise<NotaFiscal[]> {
    return this.repo.find({ where: { fecha: Between(desde, hasta) as any } });
  }

  async crear(dto: CrearNotaDto, user: User): Promise<NotaFiscal> {
    const base = Number(dto.base) || 0;
    const iva = Number(dto.iva) || 0;
    if (base <= 0 && iva <= 0) throw new BadRequestException('La nota debe tener base o IVA.');
    const fecha = dto.fecha ?? this.hoyCR();

    const nota = await this.repo.save(this.repo.create({
      tipo: dto.tipo, naturaleza: dto.naturaleza, fecha, base, iva,
      iva_tarifa: dto.iva_tarifa ?? 'T13', documento_ref: dto.documento_ref ?? null,
      motivo: dto.motivo ?? null, creado_por: user,
    }));

    // Asiento del ajuste (balanceado). Nota de VENTA-Crédito = devolución (revierte ingreso/IVA).
    try {
      const c = async (cod: string, nombre: string, tipo: any) => (await this.contabilidad.asegurarCuenta(cod, { nombre, tipo })).id;
      const total = +(base + iva).toFixed(2);
      const ingreso = await c('4100', 'Ventas de Vehículos', 'Ingreso');
      const iva2200 = await c('2200', 'Impuestos por Pagar (IVA)', 'Pasivo');
      const iva1210 = await c('1210', 'IVA Acreditable (Crédito Fiscal)', 'Activo');
      const inventario = await c('1400', 'Inventario Repuestos y Accesorios', 'Activo');
      const banco = await c('1110', 'Banco — Cuenta Corriente', 'Activo');
      const cxp = await c('2100', 'Cuentas por Pagar', 'Pasivo');

      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
      const esVenta = dto.naturaleza === 'Venta';
      const esCredito = dto.tipo === 'Credito';
      const sign = esCredito ? 1 : -1; // Crédito revierte; Débito refuerza (montos negativos = lado contrario)

      if (esVenta) {
        // Crédito de venta: Debe ingreso (base) + Debe IVA 2200 (iva) / Haber banco (total)
        lineas.push({ cuentaId: ingreso, debe: base * sign, haber: 0, descripcion: 'Ajuste ingreso' });
        if (iva > 0) lineas.push({ cuentaId: iva2200, debe: iva * sign, haber: 0, descripcion: 'Ajuste IVA débito' });
        lineas.push({ cuentaId: banco, debe: 0, haber: total * sign, descripcion: 'Devolución/ajuste al cliente' });
      } else {
        // Crédito de compra: Debe CxP (total) / Haber inventario (base) + Haber IVA 1210 (iva)
        lineas.push({ cuentaId: cxp, debe: total * sign, haber: 0, descripcion: 'Ajuste por pagar' });
        lineas.push({ cuentaId: inventario, debe: 0, haber: base * sign, descripcion: 'Ajuste inventario/gasto' });
        if (iva > 0) lineas.push({ cuentaId: iva1210, debe: 0, haber: iva * sign, descripcion: 'Ajuste IVA crédito' });
      }
      // Normalizar montos negativos → mover al lado contrario para que no haya negativos.
      const norm = lineas.map((l) => {
        let { debe, haber } = l;
        if (debe < 0) { haber += -debe; debe = 0; }
        if (haber < 0) { debe += -haber; haber = 0; }
        return { ...l, debe: +debe.toFixed(2), haber: +haber.toFixed(2) };
      });

      const asiento = await this.contabilidad.crearAsiento(user, {
        fecha,
        descripcion: `Nota de ${dto.tipo} (${dto.naturaleza}) — ${dto.motivo ?? dto.documento_ref ?? ''}`,
        tipo: 'Ajuste', referencia_tipo: 'NotaFiscal', referencia_id: nota.id,
        lineas: norm,
      });
      nota.asiento_id = asiento.id;
      await this.repo.save(nota);
    } catch { /* logueado por crearAsiento si falla */ }

    return nota;
  }
}
