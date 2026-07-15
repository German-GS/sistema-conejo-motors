import { ContabilidadService } from './contabilidad.service';

// Cuentas existentes por código (simula el plan de cuentas del usuario).
const cuentasMock = (existentes: string[]) => ({
  findOneBy: jest.fn(async ({ codigo }: any) => (existentes.includes(codigo) ? { id: Number(codigo), codigo } : null)),
});

const buildSvc = (cuentasRepo: any) =>
  new ContabilidadService(cuentasRepo, {} as any, {} as any, {} as any, {} as any);

describe('ContabilidadService — reclasificación financiamiento del socio', () => {
  it('(b) reclasifica los saldos negativos de Caja/Banco a la cuenta puente', async () => {
    const svc = buildSvc(cuentasMock(['2900', '1100', '1110']));
    jest.spyOn(svc, 'existeAsientoPorReferencia').mockResolvedValue(false);
    jest.spyOn(svc, 'getBalance').mockResolvedValue({
      cuentas: { Activo: [{ codigo: '1100', saldo: -5000 }, { codigo: '1110', saldo: -3000 }] },
    } as any);
    const crear = jest.spyOn(svc, 'crearAsiento').mockResolvedValue({ id: 1 } as any);

    const res = await svc.reclasificarCajaASocio({ id: 1 } as any, '2900');

    const { lineas } = crear.mock.calls[0][1];
    const debe = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.debe, 0);
    const haber = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.haber, 0);
    expect(debe(1100)).toBe(5000); // lleva Caja a cero
    expect(debe(1110)).toBe(3000); // lleva Banco a cero
    expect(haber(2900)).toBe(8000); // total financiado por el socio
    expect(res.total).toBe(8000);
  });

  it('(c) la reclasificación final vacía la puente hacia el destino', async () => {
    const svc = buildSvc(cuentasMock(['2900', '2150']));
    jest.spyOn(svc, 'existeAsientoPorReferencia').mockResolvedValue(false);
    jest.spyOn(svc, 'getBalance').mockResolvedValue({
      cuentas: { Pasivo: [{ codigo: '2900', saldo: 8000 }], Patrimonio: [], Activo: [] },
    } as any);
    const crear = jest.spyOn(svc, 'crearAsiento').mockResolvedValue({ id: 2 } as any);

    const res = await svc.reclasificarSocioADestino({ id: 1 } as any, '2900', '2150');
    const { lineas } = crear.mock.calls[0][1];
    const debe = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.debe, 0);
    const haber = (id: number) => lineas.filter((l: any) => l.cuentaId === id).reduce((s: number, l: any) => s + l.haber, 0);
    expect(debe(2900)).toBe(8000);  // vacía la puente
    expect(haber(2150)).toBe(8000); // al destino (préstamo del socio)
    expect(res.monto).toBe(8000);
  });

  it('(d) falla con mensaje claro si la cuenta puente no existe', async () => {
    const svc = buildSvc(cuentasMock([])); // ninguna cuenta creada
    await expect(svc.reclasificarCajaASocio({ id: 1 } as any, '2900')).rejects.toThrow(/Creá primero la cuenta 2900/);
  });

  it('(d) la reclasificación final falla si falta el destino configurado', async () => {
    const svc = buildSvc(cuentasMock(['2900']));
    await expect(svc.reclasificarSocioADestino({ id: 1 } as any, '2900', '')).rejects.toThrow(/Configuración|cuenta/);
  });
});
