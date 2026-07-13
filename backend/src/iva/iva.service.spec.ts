import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IvaService } from './iva.service';
import { LiquidacionIVA } from './liquidacion-iva.entity';
import { Venta } from '../ventas/venta.entity';
import { Gasto } from '../gastos/gasto.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { OrdenProducto } from '../productos/orden-producto.entity';
import { NotaFiscal } from '../notas-fiscales/nota-fiscal.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';

/** Repo falso mínimo con los métodos que usa el service. */
const repoMock = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((x) => x),
  save: jest.fn(async (x) => ({ id: 1, ...x })),
});

describe('IvaService — asiento de liquidación', () => {
  let service: IvaService;
  let cuentas: Record<string, { id: number; codigo: string }>;
  let crearAsiento: jest.Mock;

  beforeEach(async () => {
    cuentas = {
      '2200': { id: 2200, codigo: '2200' },
      '1210': { id: 1210, codigo: '1210' },
      '2210': { id: 2210, codigo: '2210' },
      '5700': { id: 5700, codigo: '5700' },
    };
    crearAsiento = jest.fn(async (_u, body) => ({ id: 99, ...body }));

    const contabilidad = {
      asegurarCuenta: jest.fn(async (codigo: string) => cuentas[codigo]),
      crearAsiento,
      reversarAsientosPorReferencia: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IvaService,
        { provide: getRepositoryToken(LiquidacionIVA), useValue: repoMock() },
        { provide: getRepositoryToken(Venta), useValue: repoMock() },
        { provide: getRepositoryToken(Gasto), useValue: repoMock() },
        { provide: getRepositoryToken(Vehicle), useValue: repoMock() },
        { provide: getRepositoryToken(OrdenProducto), useValue: repoMock() },
        { provide: getRepositoryToken(NotaFiscal), useValue: repoMock() },
        { provide: ContabilidadService, useValue: contabilidad },
        { provide: NotificationsService, useValue: { createForAdminsAndContadores: jest.fn() } },
      ],
    }).compile();

    service = module.get<IvaService>(IvaService);
  });

  const sum = (lineas: any[], campo: 'debe' | 'haber') =>
    +lineas.reduce((s, l) => s + (Number(l[campo]) || 0), 0).toFixed(2);

  it('cuadra con prorrata < 100% (crédito no deducible va a 5700)', async () => {
    // débito=100, crédito bruto=80, prorrata=50% → aplicable=40, noAplicable=40, plug=60
    jest.spyOn(service, 'consolidar').mockResolvedValue({
      periodo: '2026-05',
      debito_fiscal: 100,
      credito_fiscal_bruto: 80,
      porcentaje_prorrata: 50,
      credito_fiscal_aplicable: 40,
      iva_a_pagar: 60,
    } as any);

    await service.generar({ id: 1 } as User, '2026-05', 0);

    expect(crearAsiento).toHaveBeenCalledTimes(1);
    const { lineas } = crearAsiento.mock.calls[0][1];

    // El asiento debe cuadrar: Debe == Haber
    expect(sum(lineas, 'debe')).toBe(sum(lineas, 'haber'));
    expect(sum(lineas, 'debe')).toBe(140);

    const porCuenta = (id: number, campo: 'debe' | 'haber') =>
      lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + Number(l[campo]), 0);
    expect(porCuenta(2200, 'debe')).toBe(100); // débito fiscal
    expect(porCuenta(5700, 'debe')).toBe(40); // no deducible por prorrata
    expect(porCuenta(1210, 'haber')).toBe(80); // crédito bruto se cancela completo
    expect(porCuenta(2210, 'haber')).toBe(60); // IVA por pagar (plug)
  });

  it('cuadra con prorrata 100% (todo el crédito es deducible)', async () => {
    jest.spyOn(service, 'consolidar').mockResolvedValue({
      periodo: '2026-05',
      debito_fiscal: 100,
      credito_fiscal_bruto: 80,
      porcentaje_prorrata: 100,
      credito_fiscal_aplicable: 80,
      iva_a_pagar: 20,
    } as any);

    await service.generar({ id: 1 } as User, '2026-05', 0);
    const { lineas } = crearAsiento.mock.calls[0][1];
    expect(sum(lineas, 'debe')).toBe(sum(lineas, 'haber'));
    // sin 5700 (no hay no-deducible), plug = 20
    expect(lineas.some((l: any) => l.cuentaId === 5700)).toBe(false);
  });
});
