import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBodegaDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
