import { IsString, IsOptional, IsNumber, Min, IsDateString, MaxLength, IsIn } from 'class-validator';

/** Alta de cuenta por pagar. Declara los campos del formulario; montos ≥ 0. */
export class CreateCxpDto {
  @IsString() @MaxLength(200)
  concepto: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  monto_original: number;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional() @IsString() @MaxLength(50)
  factura_proveedor?: string;

  @IsOptional() @IsDateString()
  fecha_factura?: string;

  @IsOptional() @IsString() @MaxLength(3) @IsIn(['CRC', 'USD'])
  moneda?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  tipo_cambio?: number;

  @IsOptional() @IsString()
  notas?: string;
}

/** Registro de un pago sobre una CxP. */
export class PagoCxpDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  monto: number;

  @IsDateString()
  fecha: string;

  @IsOptional() @IsString() @MaxLength(100)
  referencia?: string;

  @IsOptional() @IsString() @MaxLength(50)
  metodo_pago?: string;

  @IsOptional() @IsString()
  notas?: string;
}
