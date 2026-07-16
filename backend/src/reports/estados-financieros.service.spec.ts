import { EstadosFinancierosService } from './estados-financieros.service';

// Mock del motor contable con datos controlados.
const contabilidadMock = () => ({
  getBalance: jest.fn(),
  movimientosPorCuenta: jest.fn(),
});

describe('EstadosFinancierosService — Balance clasificado (Parte A)', () => {
  it('segmenta activos/pasivos en corriente y no corriente, y cuadra', async () => {
    const contab = contabilidadMock();
    contab.getBalance.mockResolvedValue({
      cuentas: {
        Activo: [
          { codigo: '1110', nombre: 'Banco', saldo: 400, clasificacion_balance: 'Corriente' },
          { codigo: '1510', nombre: 'Mobiliario', saldo: 600, clasificacion_balance: 'NoCorriente' },
          { codigo: '1590', nombre: 'Dep. Acum.', saldo: -100, clasificacion_balance: 'NoCorriente' },
        ],
        Pasivo: [{ codigo: '2100', nombre: 'CxP', saldo: 200, clasificacion_balance: 'Corriente' }],
        Patrimonio: [{ codigo: '3100', nombre: 'Capital', saldo: 400, clasificacion_balance: null }],
      },
      totales: { totalActivos: 900, totalPasivos: 200, totalPatrimonio: 400, utilidad: 300 },
      equilibrado: true,
    });
    const svc = new EstadosFinancierosService(contab as any);
    const res = await svc.balanceGeneral('2026-05', false);
    const a = res.actual;

    expect(a.activo.corriente.map((c: any) => c.codigo)).toEqual(['1110']);
    expect(a.activo.totalCorriente).toBe(400);
    expect(a.activo.noCorriente.map((c: any) => c.codigo)).toEqual(['1510', '1590']);
    // Activo fijo neto: 600 − 100 = 500 (el contra-activo resta).
    expect(a.activo.totalNoCorriente).toBe(500);
    expect(a.activo.total).toBe(900);
    expect(a.pasivo.totalCorriente).toBe(200);
    // Activo = Pasivo + Patrimonio
    expect(a.totales.pasivoMasPatrimonio).toBe(900);
    expect(a.totales.activos).toBe(a.totales.pasivoMasPatrimonio);
    expect(a.equilibrado).toBe(true);
  });
});

describe('EstadosFinancierosService — Estado de Resultados', () => {
  it('un mes con solo gastos da utilidad neta NEGATIVA', async () => {
    const contab = contabilidadMock();
    contab.movimientosPorCuenta.mockResolvedValue([
      { codigo: '5500', nombre: 'Gastos de Ventas', tipo: 'Gasto', saldo: 29022, deltaDebeHaber: 29022 },
    ]);
    const svc = new EstadosFinancierosService(contab as any);
    const res = await svc.estadoResultados('2026-07', false);
    expect(res.actual.totalIngresos).toBe(0);
    expect(res.actual.totalGastos).toBe(29022);
    expect(res.actual.utilidadNeta).toBe(-29022);
  });
});

describe('EstadosFinancierosService — Flujo: apertura excluida', () => {
  it('un mes cuyo único evento es la carga de apertura da flujo ~0 y cuadra', async () => {
    const contab = contabilidadMock();
    // Con excluirApertura, la BD ya descartó el asiento de apertura → no llegan movimientos.
    contab.movimientosPorCuenta.mockResolvedValue([]);
    const svc = new EstadosFinancierosService(contab as any);
    const res = await svc.flujoCaja('2026-07', false);

    // Se pidió excluir la apertura.
    expect(contab.movimientosPorCuenta).toHaveBeenCalledWith('2026-07-01', expect.any(String), { excluirApertura: true });
    const f = res.actual;
    expect(f.operacion.total).toBe(0);
    expect(f.inversion.total).toBe(0);
    expect(f.variacionNeta).toBe(0);
    expect(f.variacionCajaDirecta).toBe(0);
    expect(f.cuadra).toBe(true);
  });

  it('una compra real de activo fijo pagada por banco sí aparece como salida de inversión', async () => {
    const contab = contabilidadMock();
    // Debe 1510 600 / Haber 1110 600.
    contab.movimientosPorCuenta.mockResolvedValue([
      { codigo: '1110', nombre: 'Banco', tipo: 'Activo', flujo_categoria: null, saldo: -600, deltaDebeHaber: -600 },
      { codigo: '1510', nombre: 'Mobiliario', tipo: 'Activo', flujo_categoria: 'Inversion', saldo: 600, deltaDebeHaber: 600 },
    ]);
    const svc = new EstadosFinancierosService(contab as any);
    const f = (await svc.flujoCaja('2026-07', false)).actual;
    expect(f.inversion.total).toBe(-600);     // salida por la compra
    expect(f.variacionNeta).toBe(-600);
    expect(f.variacionCajaDirecta).toBe(-600);
    expect(f.cuadra).toBe(true);
  });
});

describe('EstadosFinancierosService — Flujo indirecto (Parte B)', () => {
  it('las 3 secciones suman la variación de caja (ventas + compra de activo + depreciación)', async () => {
    const contab = contabilidadMock();
    // Período: venta 1000 al contado, compra de activo fijo 600, depreciación 100.
    contab.movimientosPorCuenta.mockResolvedValue([
      { codigo: '1110', nombre: 'Banco', tipo: 'Activo', clasificacion_balance: 'Corriente', flujo_categoria: null, saldo: 400, deltaDebeHaber: 400 },
      { codigo: '4100', nombre: 'Ventas', tipo: 'Ingreso', clasificacion_balance: null, flujo_categoria: null, saldo: 1000, deltaDebeHaber: -1000 },
      { codigo: '1510', nombre: 'Mobiliario', tipo: 'Activo', clasificacion_balance: 'NoCorriente', flujo_categoria: 'Inversion', saldo: 600, deltaDebeHaber: 600 },
      { codigo: '5450', nombre: 'Depreciación', tipo: 'Gasto', clasificacion_balance: null, flujo_categoria: null, saldo: 100, deltaDebeHaber: 100 },
      { codigo: '1590', nombre: 'Dep. Acum.', tipo: 'Activo', clasificacion_balance: 'NoCorriente', flujo_categoria: null, saldo: -100, deltaDebeHaber: -100 },
    ]);
    const svc = new EstadosFinancierosService(contab as any);
    const res = await svc.flujoCaja('2026-05', false);
    const f = res.actual;

    expect(f.operacion.total).toBe(1000); // 900 utilidad + 100 depreciación
    expect(f.inversion.total).toBe(-600); // compra de activo
    expect(f.financiamiento.total).toBe(0);
    expect(f.variacionNeta).toBe(400);
    expect(f.variacionCajaDirecta).toBe(400);
    expect(f.diferencia).toBe(0);
    expect(f.cuadra).toBe(true);
  });
});
