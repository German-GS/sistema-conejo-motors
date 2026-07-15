import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateGastoDto } from './create-gasto.dto';

// Se usa el MISMO pipe que en producción (whitelist + transform).
const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const meta = { type: 'body' as const, metatype: CreateGastoDto, data: '' };

const payloadForm = {
  categoria: 'Insumos de Taller',
  descripcion: 'Tornillos para placas',
  monto: 5000,
  fecha: '2026-07-15',
  numero_factura: 'F-001',
  nombre_comercio: 'Ferretería X',
  metodo_pago: 'Aporte del socio',
  notas: 'nota',
  base_imponible: 4424.78,
  iva_monto: 575.22,
  iva_tarifa: 'T13',
};

describe('CreateGastoDto (validación + whitelist)', () => {
  it('conserva TODOS los campos del formulario', async () => {
    const out = await pipe.transform(payloadForm, meta);
    for (const k of Object.keys(payloadForm)) {
      expect(out[k]).toEqual((payloadForm as any)[k]);
    }
  });

  it('descarta campos extra no declarados (whitelist)', async () => {
    const out = await pipe.transform({ ...payloadForm, hacker: 'x', contabilizado: true }, meta);
    expect(out.hacker).toBeUndefined();
    expect(out.contabilizado).toBeUndefined();
  });

  it('rechaza monto negativo', async () => {
    await expect(pipe.transform({ ...payloadForm, monto: -100 }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si falta la descripción', async () => {
    const { descripcion, ...sinDesc } = payloadForm;
    await expect(pipe.transform(sinDesc, meta)).rejects.toBeInstanceOf(BadRequestException);
  });
});
