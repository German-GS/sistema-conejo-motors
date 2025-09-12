import type {
  VehicleStatus,
  VehicleCategory,
  Drivetrain,
} from '../vehicle.entity';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  Length,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @Length(17, 17, { message: 'El VIN debe tener exactamente 17 caracteres' })
  vin: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  @IsNumber()
  @IsPositive()
  año: number;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsNumber()
  @IsPositive()
  precio_costo: number;

  @IsNumber()
  @IsPositive()
  precio_venta: number;

  @IsNumber()
  @IsPositive()
  autonomia_km: number;

  @IsNumber()
  @IsPositive()
  potencia_hp: number;

  @IsNumber()
  @IsPositive()
  capacidad_bateria_kwh: number;

  @IsOptional()
  @IsIn(['Sedan', 'SUV', 'Pickup', 'Hatchback', 'Comercial', 'Urbano'] as const)
  categoria?: VehicleCategory;

  @IsOptional()
  @IsIn(['4x2', '4x4', 'AWD'] as const)
  traccion?: Drivetrain;

  @IsOptional()
  @IsNumber()
  numero_pasajeros?: number;

  @IsOptional()
  @IsString()
  equipamiento_destacado?: string;

  @IsOptional()
  @IsString()
  material_interior?: string;

  @IsOptional()
  // 👇 CAMBIO AQUÍ: Añade "as const" al final del array 👇
  @IsIn(['Disponible', 'Reservado', 'Vendido'] as const)
  estado?: VehicleStatus;

  @IsOptional()
  @IsNumber()
  bodegaId?: number;
}
