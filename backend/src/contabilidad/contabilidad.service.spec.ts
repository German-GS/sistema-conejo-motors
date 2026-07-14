import { ContabilidadService } from './contabilidad.service';

describe('ContabilidadService — fecha de la reversa', () => {
  const asientoOriginal = {
    id: 42, fecha: '2026-06-15', descripcion: 'Gasto junio',
    lineas: [{ cuenta: { id: 5500 }, debe: 2500, haber: 0, descripcion: 'x' }],
  };

  const build = (periodoBloquea: any) => {
    const asientosRepo = {
      find: jest.fn().mockResolvedValue([asientoOriginal]),
      count: jest.fn().mockResolvedValue(0), // no reversado aún
    };
    const cierrePeriodosRepo = { findOne: jest.fn().mockResolvedValue(periodoBloquea) };
    const svc = new ContabilidadService(
      {} as any, asientosRepo as any, {} as any, {} as any, cierrePeriodosRepo as any,
    );
    const crear = jest.spyOn(svc, 'crearAsiento').mockResolvedValue({ id: 99 } as any);
    return { svc, crear };
  };

  it('(a) período abierto → la reversa se fecha en la fecha del asiento original', async () => {
    const { svc, crear } = build(null); // periodoQueBloquea = null (abierto)
    await svc.reversarAsientosPorReferencia('Gasto', 1, { id: 1 } as any, 'Edición');
    expect(crear.mock.calls[0][1].fecha).toBe('2026-06-15');
  });

  it('(b) período cerrado → la reversa se fecha hoy (mes abierto)', async () => {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const { svc, crear } = build({ periodo: '2026-06', cerrado: true }); // bloqueado
    await svc.reversarAsientosPorReferencia('Gasto', 1, { id: 1 } as any, 'Edición');
    expect(crear.mock.calls[0][1].fecha).toBe(hoy);
  });
});
