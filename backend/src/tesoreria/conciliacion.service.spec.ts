import { ConciliacionService } from './conciliacion.service';

describe('ConciliacionService — matching automático (Parte D)', () => {
  it('concilia por monto firmado + fecha dentro de tolerancia', async () => {
    const cuenta = { id: 1, banco: 'BAC', numero_cuenta: '123', cuenta_contable: '1110', moneda: 'CRC' };
    // Dos movimientos bancarios: un depósito (+1000) que casa, y una comisión (−500) que no.
    const bancarios = [
      { id: 10, tipo: 'Deposito', monto: 1000, fecha: '2026-05-10', conciliado: false, asiento_linea_id: null, cuenta },
      { id: 11, tipo: 'Retiro', monto: 500, fecha: '2026-05-12', conciliado: false, asiento_linea_id: null, cuenta },
    ];
    const movRepo = {
      find: jest.fn()
        .mockResolvedValueOnce(bancarios)          // no conciliados en rango
        .mockResolvedValueOnce([])                  // usadas previas
        .mockResolvedValue(bancarios),              // reporte
      save: jest.fn(async (m) => m),
    };
    const cuentasRepo = { findOneBy: jest.fn().mockResolvedValue(cuenta) };
    const contabilidad = {
      // El mayor tiene un depósito de +1000 el 2026-05-11 (1 día de diferencia).
      lineasDeCuenta: jest.fn().mockResolvedValue([
        { lineaId: 99, asientoId: 5, fecha: '2026-05-11', descripcion: 'Cobro cliente', monto: 1000 },
      ]),
      getBalance: jest.fn().mockResolvedValue({ cuentas: { Activo: [{ codigo: '1110', saldo: 1000 }] } }),
    };

    const svc = new ConciliacionService(cuentasRepo as any, movRepo as any, contabilidad as any);
    const res = await svc.conciliar(1, '2026-05-01', '2026-05-31', 3);

    expect(res.conciliados).toBe(1);
    expect(bancarios[0].conciliado).toBe(true);
    expect(bancarios[0].asiento_linea_id).toBe(99);
    // La comisión de −500 queda como "en banco no en libros".
    expect(res.enBancoNoEnLibros.map((m: any) => m.id)).toContain(11);
    expect(res.enBancoNoEnLibros.find((m: any) => m.id === 11).monto).toBe(-500);
  });
});
