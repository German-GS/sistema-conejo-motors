import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Define la forma de un único objeto de configuración que se enviará.
 */
class SettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string; // El valor siempre será un string en formato JSON.
}

/**
 * Este es el DTO principal que el controlador espera recibir.
 * Contiene un array de todas las configuraciones que se van a actualizar.
 */
export class UpdateSiteSettingsDto {
  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto dentro del array.
  @Type(() => SettingDto) // Especifica que el array contendrá objetos de tipo SettingDto.
  settings: SettingDto[];
}
