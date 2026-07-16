import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsNumber, Min, IsInt, IsDateString, MaxLength } from 'class-validator';

/** Alta de activo fijo. `costo` debe ser > 0; el resto son opcionales con defaults en el service. */
export class CrearActivoDto {
  @IsString() @MaxLength(150)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  costo: number;

  @IsOptional() @IsString()
  categoria?: string;

  @IsOptional() @IsString() @MaxLength(20)
  cuenta_activo?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  valor_residual?: number;

  @IsOptional() @IsInt() @Min(0)
  vida_util_meses?: number;

  @IsOptional() @IsInt() @Min(0)
  vida_util_fiscal_meses?: number;

  @IsOptional() @IsString()
  metodo_fiscal?: string;

  @IsOptional() @IsString()
  metodo_depreciacion?: string;

  @IsOptional() @IsString() @MaxLength(40)
  numero_inventario?: string;

  @IsOptional() @IsString() @MaxLength(120)
  localizacion?: string;

  @IsOptional() @IsDateString()
  fecha_adquisicion?: string;

  @IsOptional() @IsString() @MaxLength(20)
  contrapartida?: string;

  @IsOptional() @IsString()
  notas?: string;
}

export class ActualizarActivoDto extends PartialType(CrearActivoDto) {}
