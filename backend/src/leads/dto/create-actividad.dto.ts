import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateActividadDto {
  @IsEnum(['nota', 'llamada', 'email', 'whatsapp', 'reunion', 'estado_cambio', 'cotizacion_creada', 'financiera'])
  tipo: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  estado_fin?: string;
}
