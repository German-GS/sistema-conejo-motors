// backend/src/vehicle-profiles/dto/update-vehicle-profile.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleProfileDto, VehicleProfileImageDto } from './create-vehicle-profile.dto'; // Asegúrate de importar VehicleProfileImageDto
import { IsOptional, IsArray, ValidateNested } from 'class-validator'; // Importar
import { Type } from 'class-transformer'; // Importar

export class UpdateVehicleProfileDto extends PartialType(CreateVehicleProfileDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleProfileImageDto)
  imagenes?: VehicleProfileImageDto[];
}