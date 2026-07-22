import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCampanaDto {
  @IsString()
  nombre: string;

  @IsString()
  plataforma: string;

  @IsString()
  fecha_inicio: string;

  @IsOptional()
  @IsString()
  fecha_fin?: string;

  @IsOptional()
  @IsNumber()
  presupuesto_crc?: number;

  @IsOptional()
  @IsString()
  objetivo?: string;
}
