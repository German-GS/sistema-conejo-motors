// backend/src/vehicle-profiles/dto/create-vehicle-profile.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  VehicleCategory,
  Drivetrain,
} from '../../vehicles/vehicle.entity';

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  torque_nm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  aceleracion_0_100?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  velocidad_maxima?: number;

  @IsOptional()
  @IsIn(['Sedan', 'SUV', 'Pickup', 'Hatchback', 'Comercial', 'Urbano'] as const)
  categoria?: VehicleCategory;

  @IsOptional()
  @IsIn(['4x2', '4x4', 'AWD'] as const)
  traccion?: Drivetrain;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  largo_mm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ancho_mm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  alto_mm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distancia_ejes_mm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  peso_kg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacidad_maletero_l?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  numero_pasajeros?: number;
}
