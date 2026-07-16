import { IsString, IsOptional, MaxLength } from 'class-validator';

/** Datos del emisor editables desde Configuración. Todos opcionales (se guardan los presentes). */
export class EmisorConfigDto {
  @IsOptional() @IsString() @MaxLength(200)
  razon_social?: string;

  @IsOptional() @IsString() @MaxLength(200)
  nombre_comercial?: string;

  @IsOptional() @IsString() @MaxLength(12)
  cedula?: string;

  @IsOptional() @IsString() @MaxLength(2)
  tipo_identificacion?: string;

  @IsOptional() @IsString() @MaxLength(6)
  actividad_economica?: string;

  @IsOptional() @IsString() @MaxLength(3)
  sucursal?: string;

  @IsOptional() @IsString() @MaxLength(5)
  terminal?: string;

  @IsOptional() @IsString() @MaxLength(1)
  provincia?: string;

  @IsOptional() @IsString() @MaxLength(2)
  canton?: string;

  @IsOptional() @IsString() @MaxLength(2)
  distrito?: string;

  @IsOptional() @IsString() @MaxLength(250)
  otras_senas?: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefono?: string;

  @IsOptional() @IsString() @MaxLength(120)
  email?: string;
}
