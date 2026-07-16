import { IsString, IsOptional, IsBoolean, IsInt, Min, IsIn, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Datos de facturación (nested). Se validan los TIPOS y se conservan todos los campos que
 * envía el formulario; no se fuerza requeridad para no romper el flujo de facturación
 * (la lógica de negocio — SUGEF, depósito, etc. — se valida en el service).
 */
export class FacturarDatosDto {
  @IsOptional() @IsString()
  factura_nombre?: string;

  @IsOptional() @IsIn(['fisica', 'juridica', 'extranjero'])
  factura_tipo_cedula?: string;

  @IsOptional() @IsString()
  factura_cedula?: string;

  @IsOptional() @IsString()
  factura_email?: string;

  @IsOptional() @IsString()
  factura_telefono?: string;

  @IsOptional() @IsString()
  metodo_pago?: string;

  @IsOptional() @IsString()
  factura_notas?: string;

  @IsOptional() @IsBoolean()
  deposito_confirmado?: boolean;

  @IsOptional() @IsBoolean()
  sugef_omitir?: boolean;

  @IsOptional() @IsBoolean()
  exonerado?: boolean;

  @IsOptional() @IsString()
  numero_exoneracion?: string;

  /** Fecha histórica de la venta (YYYY-MM-DD) para reconstrucción. */
  @IsOptional() @IsDateString()
  fecha?: string;
}

export class FacturarDto {
  @IsInt() @Min(1)
  cotizacionId: number;

  @ValidateNested()
  @Type(() => FacturarDatosDto)
  datos: FacturarDatosDto;
}
