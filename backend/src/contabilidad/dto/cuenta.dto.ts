import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';

/** Alta de cuenta contable. Los campos opcionales pueden omitirse desde el formulario. */
export class CuentaDto {
  @IsString() @MaxLength(20)
  codigo: string;

  @IsString() @MaxLength(200)
  nombre: string;

  @IsIn(['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'])
  tipo: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsBoolean()
  acepta_movimientos?: boolean;

  @IsOptional() @IsBoolean()
  activa?: boolean;

  @IsOptional() @IsIn(['Corriente', 'NoCorriente'])
  clasificacion_balance?: string;

  @IsOptional() @IsIn(['Operacion', 'Inversion', 'Financiamiento'])
  flujo_categoria?: string;
}

/** Edición de cuenta: todos los campos opcionales. */
export class UpdateCuentaDto extends PartialType(CuentaDto) {}
