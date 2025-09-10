import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer'; // 👈 1. Importa Type

export class CreateVehicleProfileDto {
  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  // 👇 2. Añade @Type para transformar el string a número antes de validar
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  potencia_hp: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  autonomia_km: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  capacidad_bateria_kwh: number;
}
