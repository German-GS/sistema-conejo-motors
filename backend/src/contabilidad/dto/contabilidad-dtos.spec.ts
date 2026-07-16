import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CrearAsientoDto } from './crear-asiento.dto';
import { CuentaDto } from './cuenta.dto';
import { CrearActivoDto } from '../../activos-fijos/dto/activo.dto';
import { EmisorConfigDto } from '../../facturacion/dto/emisor-config.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const run = (payload: any, metatype: any) => pipe.transform(payload, { type: 'body', metatype, data: '' });

describe('DTOs contabilidad / activos / emisor', () => {
  it('CrearAsientoDto conserva líneas + forzar, y valida', async () => {
    const payload = {
      fecha: '2026-07-15', descripcion: 'Ajuste', tipo: 'Manual', forzar: true,
      lineas: [
        { cuentaId: 1, debe: 1000, haber: 0, descripcion: 'a' },
        { cuentaId: 2, debe: 0, haber: 1000 },
      ],
    };
    const out = await run(payload, CrearAsientoDto);
    expect(out.forzar).toBe(true); // no lo descarta el whitelist
    expect(out.lineas).toHaveLength(2);
    expect(out.lineas[0].cuentaId).toBe(1);
  });

  it('CrearAsientoDto rechaza línea con debe negativo o menos de 2 líneas', async () => {
    await expect(run({ fecha: '2026-07-15', descripcion: 'x', lineas: [{ cuentaId: 1, debe: -5, haber: 0 }, { cuentaId: 2, debe: 0, haber: 5 }] }, CrearAsientoDto))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(run({ fecha: '2026-07-15', descripcion: 'x', lineas: [{ cuentaId: 1, debe: 5, haber: 0 }] }, CrearAsientoDto))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('CuentaDto rechaza tipo inválido', async () => {
    const ok = await run({ codigo: '9999', nombre: 'Test', tipo: 'Activo', descripcion: 'd' }, CuentaDto);
    expect(ok.codigo).toBe('9999');
    await expect(run({ codigo: '9', nombre: 'x', tipo: 'Otro' }, CuentaDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CrearActivoDto exige costo > 0 y conserva los campos del form', async () => {
    const payload = { nombre: 'Torno', categoria: 'Equipo de Taller', cuenta_activo: '1510', costo: 500000, valor_residual: 0, vida_util_meses: 60, contrapartida: '2100', notas: 'n' };
    const out = await run(payload, CrearActivoDto);
    for (const k of Object.keys(payload)) expect(out[k]).toEqual((payload as any)[k]);
    await expect(run({ ...payload, costo: 0 }, CrearActivoDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('EmisorConfigDto conserva todos los campos del form', async () => {
    const payload = { razon_social: 'GUACHIPLAZA S.A.', nombre_comercial: 'Conejo Motors', cedula: '3101857775', tipo_identificacion: '02', actividad_economica: '451000', sucursal: '001', terminal: '00001', provincia: '1', canton: '01', distrito: '01', otras_senas: 'x', telefono: '22000000', email: 'c@x.com' };
    const out = await run(payload, EmisorConfigDto);
    for (const k of Object.keys(payload)) expect(out[k]).toEqual((payload as any)[k]);
  });
});
