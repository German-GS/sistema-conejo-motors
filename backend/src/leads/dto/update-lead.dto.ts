import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  nombre_cliente?: string;

  @IsOptional()
  @IsEnum(['Nuevo', 'Contactado', 'En Progreso', 'Cerrado', 'Perdido'])
  estado?: string;

  @IsOptional()
  @IsEnum(['Web', 'Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'Referido', 'Presencial', 'Otro'])
  fuente?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsDateString()
  fecha_followup?: string;

  @IsOptional()
  @IsNumber()
  vendedor_asignado_id?: number;

  @IsOptional()
  contacted_by_email?: boolean;

  @IsOptional()
  contacted_by_phone?: boolean;

  @IsOptional()
  contacted_by_whatsapp?: boolean;

  @IsOptional()
  @IsEnum(['Contado', 'Crédito'])
  tipo_pago?: string;

  @IsOptional()
  @IsNumber()
  campana_id?: number | null;
}
