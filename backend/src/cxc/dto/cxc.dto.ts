import { IsString, IsOptional, IsNumber, Min, IsDateString, MaxLength } from 'class-validator';

/** Alta de cuenta por cobrar. Declara los campos del formulario; montos ≥ 0. */
export class CreateCxcDto {
  @IsString() @MaxLength(200)
  concepto: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  monto_original: number;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional() @IsString() @MaxLength(40)
  tipo?: string;

  @IsOptional() @IsDateString()
  fecha_emision?: string;

  @IsOptional() @IsString()
  notas?: string;
}

/** Registro de un cobro sobre una CxC. */
export class PagoCxcDto {
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
