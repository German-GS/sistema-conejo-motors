// backend/src/vehicles/dto/create-vehicle.dto.ts

import type {
  VehicleStatus,
  VehicleCategory,
  Drivetrain,
} from '../vehicle.entity';
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  Length,
  ValidateNested,
  Matches, // 👈 Importa Matches
} from 'class-validator';

class VehicleImageDto {
  @IsString()
  url: string;

  @IsNumber()
  order: number;
}

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'El VIN es obligatorio.' })
  @Length(17, 17, { message: 'El VIN debe tener exactamente 17 caracteres.' })
  vin: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Se debe seleccionar un perfil de modelo.' })
  profileId: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'La marca es obligatoria.' })
  marca: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El modelo es obligatorio.' })
  modelo: string;

  @IsNumber({}, { message: 'El año debe ser un número.' })
  @IsPositive({ message: 'El año debe ser un número positivo.' })
  año: number;

  @IsString()
  @IsNotEmpty({ message: 'El color es obligatorio.' })
  color: string;

  @IsNumber({}, { message: 'El precio de costo debe ser un número.' })
  @IsPositive({ message: 'El precio de costo debe ser positivo.' })
  precio_costo: number;

  @IsNumber({}, { message: 'El precio de venta debe ser un número.' })
  @IsPositive({ message: 'El precio de venta debe ser positivo.' })
  precio_venta: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  autonomia_km: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  potencia_hp: number;

  @IsNumber()
  @IsOptional()
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
  @IsOptional()
  @IsString()
  colores_disponibles?: string;

  @IsOptional()
  @IsString()
  seguridad?: string;

  @IsOptional()
  @IsString()
  interior?: string;

  @IsOptional()
  @IsString()
  exterior?: string;

  @IsOptional()
  @IsString()
  tecnologia?: string;

  @IsOptional()
  @IsNumber()
  bodegaId?: number;

   @IsOptional()
  @IsNumber()
  torque_nm?: number;

  @IsOptional()
  @IsNumber()
  aceleracion_0_100?: number;

  @IsOptional()
  @IsNumber()
  velocidad_maxima?: number;

  @IsOptional()
  @IsNumber()
  tiempo_carga_dc?: number;

  @IsOptional()
  @IsNumber()
  tiempo_carga_ac?: number;
  
  @IsOptional()
  @IsNumber()
  largo_mm?: number;

  @IsOptional()
  @IsNumber()
  ancho_mm?: number;

  @IsOptional()
  @IsNumber()
  alto_mm?: number;

  @IsOptional()
  @IsNumber()
  distancia_ejes_mm?: number;

  @IsOptional()
  @IsNumber()
  peso_kg?: number;

  @IsOptional()
  @IsNumber()
  capacidad_maletero_l?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleImageDto)
  imagenes?: VehicleImageDto[];

  /* @IsIn(['Disponible', 'Reservado', 'Vendido'] as const)
  estado?: VehicleStatus;
  @IsOptional()
  @IsString()
  @Matches(/^[\w\s]+(,\s*[\w\s]+)*(,\s*)?$/, {
    message: 'Los colores deben ser palabras separadas por comas (ej: Rojo, Blanco, Azul).',
  })
  colores_disponibles?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w\s]+(,\s*[\w\s]+)*(,\s*)?$/, {
    message: 'La seguridad debe ser una lista de características separadas por comas.',
  })
  seguridad?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w\s]+(,\s*[\w\s]+)*(,\s*)?$/, {
    message: 'El interior debe ser una lista de características separadas por comas.',
  })
  interior?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w\s]+(,\s*[\w\s]+)*(,\s*)?$/, {
    message: 'El exterior debe ser una lista de características separadas por comas.',
  })
  exterior?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w\s]+(,\s*[\w\s]+)*(,\s*)?$/, {
    message: 'La tecnología debe ser una lista de características separadas por comas.',
  })
  tecnologia?: string; */

  
}
