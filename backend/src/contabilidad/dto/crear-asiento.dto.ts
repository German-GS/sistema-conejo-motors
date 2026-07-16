import { IsString, IsOptional, IsNumber, Min, IsInt, IsArray, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class LineaAsientoDto {
  @IsInt()
  cuentaId: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  debe: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  haber: number;

  @IsOptional() @IsString()
  descripcion?: string;
}

/**
 * Asiento manual. La validación de partida doble (débitos = créditos) la sigue haciendo
 * ContabilidadService.crearAsiento; acá se validan tipos/estructura. `forzar` debe estar
 * declarado para que no lo descarte el whitelist (lo usa el controller para admins).
 */
export class CrearAsientoDto {
  @IsString()
  fecha: string;

  @IsString()
  descripcion: string;

  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsInt()
  referencia_id?: number;

  @IsOptional() @IsString()
  referencia_tipo?: string;

  @IsOptional() @IsBoolean()
  forzar?: boolean;

  @IsArray() @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LineaAsientoDto)
  lineas: LineaAsientoDto[];
}
