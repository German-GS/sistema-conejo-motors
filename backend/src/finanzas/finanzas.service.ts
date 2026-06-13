import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CuentaPagar } from '../cxp/cuenta-pagar.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

const ESTADOS_ABIERTOS = ['Pendiente', 'Pagado Parcial', 'Vencido'];

@Injectable()
export class FinanzasService {
  constructor(
    @InjectRepository(CuentaCobrar) private cxcRepo: Repository<CuentaCobrar>,
    @InjectRepository(CuentaPagar) private cxpRepo: Repository<CuentaPagar>,
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    private readonly contabilidad: ContabilidadService,
  ) {}

  /** Checklist de validaciones antes del cierre de mes */
  async getChecklistCierre(): Promise<any> {
    const hoy = new Date().toISOString().split('T')[0];
    const items: { clave: string; titulo: string; estado: 'ok' | 'alerta' | 'info'; detalle: string }[] = [];

    // 1) Balance contable equilibrado
    try {
      const balance = await this.contabilidad.getBalance();
      items.push({
        clave: 'balance',
        titulo: 'Balance contable equilibrado',
        estado: balance?.equilibrado ? 'ok' : 'alerta',
        detalle: balance?.equilibrado
          ? 'Activos = Pasivos + Patrimonio + Utilidad'
          : 'El balance no cuadra; revise los asientos.',
      });
      items.push({
        clave: 'utilidad',
        titulo: 'Utilidad del período',
        estado: 'info',
        detalle: `₡${Number(balance?.totales?.utilidad ?? 0).toLocaleString('es-CR')}`,
      });
    } catch {
      items.push({ clave: 'balance', titulo: 'Plan de cuentas', estado: 'alerta', detalle: 'El plan de cuentas no está inicializado.' });
    }

    // 2) CxC vencidas
    const cxc = await this.cxcRepo.find();
    const cxcVencidas = cxc.filter((c) => ESTADOS_ABIERTOS.includes(c.estado) && c.fecha_vencimiento && c.fecha_vencimiento < hoy);
    items.push({
      clave: 'cxc_vencidas',
      titulo: 'Cuentas por cobrar vencidas',
      estado: cxcVencidas.length > 0 ? 'alerta' : 'ok',
      detalle: cxcVencidas.length > 0
        ? `${cxcVencidas.length} factura(s) vencida(s) por ₡${cxcVencidas.reduce((s, c) => s + Number(c.saldo_pendiente || 0), 0).toLocaleString('es-CR')}`
        : 'Sin cuentas por cobrar vencidas',
    });

    // 3) CxP vencidas
    const cxp = await this.cxpRepo.find();
    const cxpVencidas = cxp.filter((c) => ESTADOS_ABIERTOS.includes(c.estado) && c.fecha_vencimiento && c.fecha_vencimiento < hoy);
    items.push({
      clave: 'cxp_vencidas',
      titulo: 'Cuentas por pagar vencidas',
      estado: cxpVencidas.length > 0 ? 'alerta' : 'ok',
      detalle: cxpVencidas.length > 0
        ? `${cxpVencidas.length} pago(s) vencido(s) por ₡${cxpVencidas.reduce((s, c) => s + Number(c.saldo_pendiente || 0), 0).toLocaleString('es-CR')}`
        : 'Sin cuentas por pagar vencidas',
    });

    // 4) Inventario valorizado (costo del stock disponible)
    const stock = await this.vehiclesRepo.find({ where: { estado: 'Disponible' } });
    const valorInventario = stock.reduce((s, v) => s + (Number(v.precio_costo) || 0), 0);
    items.push({
      clave: 'inventario',
      titulo: 'Inventario valorizado',
      estado: 'info',
      detalle: `${stock.length} vehículo(s) · ₡${valorInventario.toLocaleString('es-CR')} al costo`,
    });

    const alertas = items.filter((i) => i.estado === 'alerta').length;
    return { items, alertas, listoParaCerrar: alertas === 0 };
  }

  /** Resumen financiero unificado: caja, por cobrar, por pagar y flujo proyectado */
  async getResumen(): Promise<any> {
    const hoy = new Date().toISOString().split('T')[0];

    const [cxc, cxp] = await Promise.all([
      this.cxcRepo.find(),
      this.cxpRepo.find(),
    ]);

    const abiertas = (estado: string) => ESTADOS_ABIERTOS.includes(estado);
    const sum = (arr: any[]) => arr.reduce((s, x) => s + (Number(x.saldo_pendiente) || 0), 0);

    const cxcAbiertas = cxc.filter((c) => abiertas(c.estado));
    const cxpAbiertas = cxp.filter((c) => abiertas(c.estado));

    const porCobrar = sum(cxcAbiertas);
    const porPagar = sum(cxpAbiertas);

    const cxcVencidas = cxcAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento < hoy);
    const cxpVencidas = cxpAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento < hoy);

    // Saldo en caja y bancos desde el balance contable (cuentas 1100/1110/1120)
    let saldoCajaBancos = 0;
    try {
      const balance = await this.contabilidad.getBalance();
      const activos = balance?.cuentas?.Activo ?? [];
      saldoCajaBancos = activos
        .filter((c: any) => ['1100', '1110', '1120'].includes(c.codigo))
        .reduce((s: number, c: any) => s + (Number(c.saldo) || 0), 0);
    } catch { /* plan de cuentas no inicializado */ }

    const flujoProyectado = saldoCajaBancos + porCobrar - porPagar;

    // Próximos vencimientos (7, 30 días) para el flujo
    const enDias = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };
    const limite7 = enDias(7);
    const limite30 = enDias(30);
    const cobrar7 = sum(cxcAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento <= limite7));
    const pagar7 = sum(cxpAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento <= limite7));
    const cobrar30 = sum(cxcAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento <= limite30));
    const pagar30 = sum(cxpAbiertas.filter((c) => c.fecha_vencimiento && c.fecha_vencimiento <= limite30));

    return {
      saldoCajaBancos,
      porCobrar,
      porPagar,
      flujoProyectado,
      cuentas: {
        cxcAbiertas: cxcAbiertas.length,
        cxpAbiertas: cxpAbiertas.length,
        cxcVencidas: cxcVencidas.length,
        cxpVencidas: cxpVencidas.length,
        montoCxcVencidas: sum(cxcVencidas),
        montoCxpVencidas: sum(cxpVencidas),
      },
      proyeccion: {
        dias7: { cobrar: cobrar7, pagar: pagar7, neto: saldoCajaBancos + cobrar7 - pagar7 },
        dias30: { cobrar: cobrar30, pagar: pagar30, neto: saldoCajaBancos + cobrar30 - pagar30 },
      },
    };
  }
}
