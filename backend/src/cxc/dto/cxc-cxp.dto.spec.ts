import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateCxcDto } from './cxc.dto';
import { CreateCxpDto } from '../../cxp/dto/cxp.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

describe('DTOs de dinero — CxC / CxP', () => {
  it('CxC conserva los campos del formulario y descarta extras', async () => {
    const payload = { concepto: 'Venta', tipo: 'Venta Vehiculo', monto_original: 1000000, fecha_vencimiento: '2026-08-01', fecha_emision: '2026-07-15', notas: 'x' };
    const out = await pipe.transform({ ...payload, hacker: 1 }, { type: 'body', metatype: CreateCxcDto, data: '' });
    for (const k of Object.keys(payload)) expect(out[k]).toEqual((payload as any)[k]);
    expect(out.hacker).toBeUndefined();
  });

  it('CxC rechaza monto negativo', async () => {
    await expect(pipe.transform(
      { concepto: 'x', monto_original: -1, fecha_vencimiento: '2026-08-01' },
      { type: 'body', metatype: CreateCxcDto, data: '' },
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CxP conserva moneda/tipo_cambio y rechaza moneda inválida', async () => {
    const payload = { concepto: 'Compra', monto_original: 500, fecha_vencimiento: '2026-08-01', factura_proveedor: 'F-9', moneda: 'USD', tipo_cambio: 520 };
    const out = await pipe.transform(payload, { type: 'body', metatype: CreateCxpDto, data: '' });
    expect(out.moneda).toBe('USD');
    expect(out.tipo_cambio).toBe(520);
    await expect(pipe.transform({ ...payload, moneda: 'EUR' }, { type: 'body', metatype: CreateCxpDto, data: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
