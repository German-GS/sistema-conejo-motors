import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { FacturarDto } from './facturar.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const meta = { type: 'body' as const, metatype: FacturarDto, data: '' };

// Payload real que arma PendingBillingPage.
const payload = {
  cotizacionId: 12,
  datos: {
    factura_nombre: 'Cliente X',
    factura_tipo_cedula: 'fisica',
    factura_cedula: '1-1111-1111',
    factura_email: 'c@x.com',
    factura_telefono: '88880000',
    metodo_pago: 'Efectivo',
    factura_notas: 'nota',
    deposito_confirmado: true,
    sugef_omitir: false,
    exonerado: true,
    numero_exoneracion: 'EX-123',
    fecha: '2026-05-10',
  },
};

describe('FacturarDto (validación anidada + whitelist)', () => {
  it('conserva TODOS los campos de datos y el cotizacionId', async () => {
    const out = await pipe.transform(payload, meta);
    expect(out.cotizacionId).toBe(12);
    for (const k of Object.keys(payload.datos)) {
      expect(out.datos[k]).toEqual((payload.datos as any)[k]);
    }
  });

  it('descarta campos extra dentro de datos (whitelist anidado)', async () => {
    const out = await pipe.transform({ ...payload, datos: { ...payload.datos, hacker: 1 } }, meta);
    expect((out.datos as any).hacker).toBeUndefined();
  });

  it('rechaza cotizacionId faltante o inválido', async () => {
    await expect(pipe.transform({ datos: payload.datos }, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ ...payload, cotizacionId: 0 }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza tipo de cédula inválido', async () => {
    await expect(pipe.transform({ ...payload, datos: { ...payload.datos, factura_tipo_cedula: 'otro' } }, meta))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
