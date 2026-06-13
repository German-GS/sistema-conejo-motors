import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Importacion } from './importacion.entity';
import { ImportacionVehiculo } from './importacion-vehiculo.entity';
import { ImportacionesService } from './importaciones.service';
import { ImportacionesController } from './importaciones.controller';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleEstadoHistorial } from '../vehicles/vehicle-estado-historial.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Importacion, ImportacionVehiculo, Vehicle, VehicleEstadoHistorial])],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
  exports: [ImportacionesService],
})
export class ImportacionesModule {}
