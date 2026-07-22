import { IsOptional, IsString } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  nombre_completo: string;

  @IsString()
  cedula: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
