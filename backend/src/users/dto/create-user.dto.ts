// backend/src/users/dto/create-user.dto.ts
import { IsEmail, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nombre_completo: string;

  @IsEmail()
  email: string;

  @IsString()
  contrasena: string;

  @IsOptional()
  @IsNumber()
  salario_base?: number;

  @IsOptional()
  @IsInt()
  rol_id?: number;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  numero_cuenta?: string;

  @IsOptional()
  @IsString()
  puesto?: string;
}
