import { IsString, IsOptional, IsNumber, Min, IsDateString, MaxLength } from 'class-validator';

/**
 * DTO del gasto. Declara TODOS los campos que envía el formulario (con `whitelist`
 * activo, lo no declarado se descarta). Los montos deben ser ≥ 0.
 */
export class CreateGastoDto {
  @IsString()
  @MaxLength(250)
  descripcion: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto: number;

  @IsDateString()
  fecha: string;

  @IsOptional() @IsString() @MaxLength(60)
  categoria?: string;

  @IsOptional() @IsString() @MaxLength(150)
  nombre_comercio?: string;

  @IsOptional() @IsString() @MaxLength(100)
  numero_factura?: string;

  @IsOptional() @IsString() @MaxLength(30)
  metodo_pago?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  base_imponible?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  iva_monto?: number;

  @IsOptional() @IsString() @MaxLength(10)
  iva_tarifa?: string;

  @IsOptional() @IsString() @MaxLength(20)
  tipo_credito?: string;

  @IsOptional() @IsString()
  notas?: string;
}
