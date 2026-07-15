import { SaludFinancieraService } from './salud-financiera.service';

// Constructores de datos mock para un período.
const bg = (corrA: number, corrP: number, activos: number, pasivos: number, patrimonio: number) => ({
  actual: {
    fechaCorte: '2026-05-31',
    activo: { totalCorriente: corrA },
    pasivo: { totalCorriente: corrP },
    totales: { activos, pasivos, patrimonio },
  },
});
const gb = (inv1300: number, cxc1200: number, cxp2100: number) => ({
  cuentas: {
    Activo: [{ codigo: '1300', saldo: inv1300 }, { codigo: '1400', saldo: 0 }, { codigo: '1200', saldo: cxc1200 }],
    Pasivo: [{ codigo: '2100', saldo: cxp2100 }],
    Patrimonio: [],
  },
});
const mov = (ventas: number, costo: number, gastoExtra: number) => [
  { codigo: '4100', tipo: 'Ingreso', saldo: ventas },
  { codigo: '5100', tipo: 'Gasto', saldo: costo },
  { codigo: '5400', tipo: 'Gasto', saldo: gastoExtra },
];

const build = () => {
  const estados = { balanceGeneral: jest.fn() };
  const contab = { getBalance: jest.fn(), movimientosPorCuenta: jest.fn() };
  const svc = new SaludFinancieraService(contab as any, estados as any);
  return { svc, estados, contab };
};

const ind = (res: any, nombre: string) => res.indicadores.find((i: any) => i.nombre === nombre);

describe('SaludFinancieraService', () => {
  it('(a) razón corriente con activo/pasivo conocidos', async () => {
    const { svc, estados, contab } = build();
    estados.balanceGeneral.mockResolvedValue(bg(150000, 100000, 300000, 100000, 200000));
    contab.getBalance.mockResolvedValue(gb(20000, 50000, 40000));
    contab.movimientosPorCuenta.mockResolvedValue(mov(200000, 150000, 30000));

    const res = await svc.analizar('2026-05', false);
    const rc = ind(res, 'Razón corriente');
    expect(rc.valor).toBe(1.5);
    expect(rc.semaforo).toBe('verde');
    // Empresa sana → diagnóstico global verde.
    expect(res.diagnostico.semaforoGlobal).toBe('verde');
    expect(res.diagnostico.riesgos.length).toBe(0);
  });

  it('(b) casos borde: pasivo 0 → na; sin romper', async () => {
    const { svc, estados, contab } = build();
    estados.balanceGeneral.mockResolvedValue(bg(150000, 0, 300000, 0, 300000));
    contab.getBalance.mockResolvedValue(gb(0, 0, 0));
    contab.movimientosPorCuenta.mockResolvedValue([]); // sin ventas

    const res = await svc.analizar('2026-05', false);
    expect(ind(res, 'Razón corriente').semaforo).toBe('na');
    expect(ind(res, 'Margen bruto').semaforo).toBe('na');
    // Etapa pre-operativa reconocida en el diagnóstico.
    expect(res.diagnostico.resumen).toMatch(/pre-operativa/i);
  });

  it('(b) patrimonio negativo → rojo con mensaje, sin ratios engañosos', async () => {
    const { svc, estados, contab } = build();
    estados.balanceGeneral.mockResolvedValue(bg(50000, 100000, 100000, 105000, -5000));
    contab.getBalance.mockResolvedValue(gb(0, 0, 50000));
    contab.movimientosPorCuenta.mockResolvedValue(mov(100000, 90000, 20000));

    const res = await svc.analizar('2026-05', false);
    const de = ind(res, 'Deuda / Patrimonio');
    expect(de.valor).toBeNull();
    expect(de.semaforo).toBe('rojo');
    expect(de.interpretacion).toMatch(/patrimonio negativo/i);
  });

  it('(d) tendencia favorable/desfavorable según el tipo de indicador', async () => {
    const { svc, estados, contab } = build();
    // Actual mejor que anterior: RC sube (favorable) y endeudamiento baja (favorable).
    estados.balanceGeneral
      .mockResolvedValueOnce(bg(150000, 100000, 300000, 100000, 200000))  // actual
      .mockResolvedValueOnce(bg(120000, 100000, 300000, 150000, 150000)); // anterior
    contab.getBalance
      .mockResolvedValueOnce(gb(20000, 50000, 40000))
      .mockResolvedValueOnce(gb(20000, 50000, 40000));
    contab.movimientosPorCuenta
      .mockResolvedValueOnce(mov(200000, 150000, 30000))
      .mockResolvedValueOnce(mov(200000, 150000, 30000));

    const res = await svc.analizar('2026-05', true);
    expect(ind(res, 'Razón corriente').tendencia).toBe('mejora');       // subió → mejora
    expect(ind(res, 'Razón de endeudamiento').tendencia).toBe('mejora'); // bajó → mejora
  });
});
