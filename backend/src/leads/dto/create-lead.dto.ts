// src/leads/dto/create-lead.dto.ts
import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsNumber()
  @IsOptional()
  vehiculoId?: number;
}
