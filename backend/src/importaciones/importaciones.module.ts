import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Importacion } from './importacion.entity';
import { ImportacionVehiculo } from './importacion-vehiculo.entity';
import { ImportacionesService } from './importaciones.service';
import { ImportacionesController } from './importaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Importacion, ImportacionVehiculo])],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
  exports: [ImportacionesService],
})
export class ImportacionesModule {}
