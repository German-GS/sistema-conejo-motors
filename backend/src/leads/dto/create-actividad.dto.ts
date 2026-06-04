import { IsString, IsEnum } from 'class-validator';

export class CreateActividadDto {
  @IsEnum(['nota', 'llamada', 'email', 'whatsapp', 'reunion', 'estado_cambio', 'cotizacion_creada'])
  tipo: string;

  @IsString()
  descripcion: string;
}
