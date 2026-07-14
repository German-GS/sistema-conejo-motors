import { DiferencialCambiarioService } from './diferencial-cambiario.service';

describe('DiferencialCambiarioService — revaluación (Parte C)', () => {
  const cuentas: Record<string, { id: number }> = { '4310': { id: 4310 }, '5600': { id: 5600 }, '1200': { id: 1200 }, '2100': { id: 2100 } };

  const build = (opts: { existe: boolean; cxp: any[]; crearAsiento: jest.Mock }) => {
    const cxcRepo = { find: jest.fn().mockResolvedValue([]), save: jest.fn() };
    const cxpRepo = { find: jest.fn().mockResolvedValue(opts.cxp), save: jest.fn(async (x) => x) };
    const contabilidad = {
      existeAsientoPorReferencia: jest.fn().mockResolvedValue(opts.existe),
      asegurarCuenta: jest.fn(async (codigo: string) => cuentas[codigo]),
      crearAsiento: opts.crearAsiento,
    };
    const tipoCambio = { getVenta: jest.fn().mockResolvedValue(520) };
    return new DiferencialCambiarioService(cxcRepo as any, cxpRepo as any, contabilidad as any, tipoCambio as any);
  };

  it('CxP USD a ₡500 revaluada a ₡520 genera pérdida cambiaria (Debe 5600 / Haber 2100)', async () => {
    const crearAsiento = jest.fn(async (_u, body) => ({ id: 7, ...body }));
    const cxp = [{ numero: 'CXP-1', moneda: 'USD', estado: 'Pendiente', saldo_pendiente: 500, tipo_cambio: 500 }];
    const svc = build({ existe: false, cxp, crearAsiento });

    const res = await svc.revaluarPeriodo({ id: 1 } as any, '2026-05', 520);

    expect(crearAsiento).toHaveBeenCalledTimes(1);
    const { lineas } = crearAsiento.mock.calls[0][1];
    const debe = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.debe, 0);
    const haber = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.haber, 0);
    expect(debe(5600)).toBe(20);  // pérdida
    expect(haber(2100)).toBe(20); // aumenta el pasivo
    // El saldo de la CxP se actualiza al valor revaluado y al TC de cierre.
    expect(cxp[0].saldo_pendiente).toBe(520);
    expect(cxp[0].tipo_cambio).toBe(520);
    expect(res.documentos).toBe(1);
  });

  it('es idempotente: si el asiento del período ya existe, no duplica', async () => {
    const crearAsiento = jest.fn();
    const svc = build({ existe: true, cxp: [], crearAsiento });
    const res = await svc.revaluarPeriodo({ id: 1 } as any, '2026-05', 520);
    expect(res.yaRevaluado).toBe(true);
    expect(crearAsiento).not.toHaveBeenCalled();
  });
});
