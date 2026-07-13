import { NumeracionService } from './numeracion.service';

// Solo se prueban los armadores puros (clave/consecutivo). El secuencial atómico
// requiere DB y se cubre en pruebas de integración.
const svc = () => new NumeracionService(null as any, null as any);

describe('NumeracionService — consecutivo (20 dígitos)', () => {
  it('arma sucursal(3)+terminal(5)+tipo(2)+secuencial(10)', () => {
    const c = svc().armarConsecutivo({ sucursal: '001', terminal: '00001', tipo: '01', secuencial: 123 });
    expect(c).toBe('00100001' + '01' + '0000000123');
    expect(c).toHaveLength(20);
  });

  it('rellena defaults y padding', () => {
    const c = svc().armarConsecutivo({ tipo: '03', secuencial: 7 });
    expect(c).toBe('001' + '00001' + '03' + '0000000007');
    expect(c).toHaveLength(20);
  });

  it('conserva los 10 dígitos menos significativos si el secuencial desborda', () => {
    const c = svc().armarConsecutivo({ tipo: '01', secuencial: '999999999999' }); // 12 dígitos
    expect(c.slice(-10)).toBe('9999999999');
    expect(c).toHaveLength(20);
  });
});

describe('NumeracionService — clave numérica (50 dígitos)', () => {
  it('arma 506 + DDMMAA + cédula(12) + consecutivo(20) + situación(1) + seguridad(8)', () => {
    const consecutivo = svc().armarConsecutivo({ tipo: '01', secuencial: 123 });
    const { clave, codigoSeguridad, situacion } = svc().armarClave({
      cedulaEmisor: '3101123456',
      consecutivo,
      fecha: new Date('2026-05-09T10:00:00'),
      situacion: '1',
      codigoSeguridad: '12345678',
    });

    expect(clave).toHaveLength(50);
    expect(clave.startsWith('506')).toBe(true);
    // DDMMAA de 2026-05-09 → 090526
    expect(clave.slice(3, 9)).toBe('090526');
    // cédula rellenada a 12
    expect(clave.slice(9, 21)).toBe('003101123456');
    // consecutivo (20)
    expect(clave.slice(21, 41)).toBe(consecutivo);
    // situación (1)
    expect(clave.slice(41, 42)).toBe('1');
    // código de seguridad (8)
    expect(clave.slice(42, 50)).toBe('12345678');
    expect(codigoSeguridad).toBe('12345678');
    expect(situacion).toBe('1');
  });

  it('genera código de seguridad de 8 dígitos cuando no se pasa', () => {
    const consecutivo = svc().armarConsecutivo({ tipo: '01', secuencial: 1 });
    const { clave, codigoSeguridad } = svc().armarClave({ cedulaEmisor: '3101123456', consecutivo });
    expect(codigoSeguridad).toMatch(/^\d{8}$/);
    expect(clave).toHaveLength(50);
  });

  it('situación por defecto = 1 (normal)', () => {
    const consecutivo = svc().armarConsecutivo({ tipo: '01', secuencial: 1 });
    const { situacion } = svc().armarClave({ cedulaEmisor: '3101123456', consecutivo });
    expect(situacion).toBe('1');
  });
});
