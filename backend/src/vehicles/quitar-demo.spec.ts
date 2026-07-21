import { VehiclesService } from './vehicles.service';

describe('VehiclesService.quitarDemo — costo neto al reingresar (fix #1)', () => {
  it('baja precio_costo al valor neto y arma el asiento correcto', async () => {
    // Demo de ₡10M con ₡2M depreciados → vuelve a inventario a ₡8M.
    const demo: any = { id: 1, estado: 'Demo', precio_costo: 10_000_000, depreciacion_acumulada: 2_000_000, vin: 'VIN1', marca: 'BYD', modelo: 'Dolphin' };
    const vehiclesRepo = {
      findOneBy: jest.fn().mockResolvedValue(demo),
      save: jest.fn(async (x) => x),
      findOneByOrFail: jest.fn().mockResolvedValue(demo),
    };
    const historialRepo = { create: jest.fn((x) => x), save: jest.fn() };
    const crearAsiento = jest.fn().mockResolvedValue({ id: 1 });
    const contabilidad = {
      asegurarCuenta: jest.fn(async (codigo: string) => ({ id: Number(codigo), codigo })),
      crearAsiento,
    };
    const svc = new VehiclesService(
      vehiclesRepo as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, historialRepo as any, contabilidad as any,
    );

    await svc.quitarDemo(1, 5);

    // precio_costo bajó al neto (8M), depreciación reseteada.
    expect(demo.precio_costo).toBe(8_000_000);
    expect(demo.depreciacion_acumulada).toBe(0);
    expect(demo.ultimo_periodo_depreciado_demo).toBeNull();

    // Asiento: Debe 1300 neto (8M) + Debe 1525 acum (2M) / Haber 1520 costo (10M).
    const { lineas } = crearAsiento.mock.calls[0][1];
    const debe = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.debe, 0);
    const haber = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.haber, 0);
    expect(debe(1300)).toBe(8_000_000);
    expect(debe(1525)).toBe(2_000_000);
    expect(haber(1520)).toBe(10_000_000);
    // El asiento cuadra.
    const totalDebe = lineas.reduce((s: number, l: any) => s + l.debe, 0);
    const totalHaber = lineas.reduce((s: number, l: any) => s + l.haber, 0);
    expect(totalDebe).toBe(totalHaber);
  });
});
