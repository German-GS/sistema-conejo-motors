import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CosteoVehiculo } from './costeo-vehiculo.entity';
import { CosteoVehiculosService } from './costeo-vehiculos.service';
import { CosteoVehiculosController } from './costeo-vehiculos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CosteoVehiculo])],
  controllers: [CosteoVehiculosController],
  providers: [CosteoVehiculosService],
  exports: [CosteoVehiculosService],
})
export class CosteoVehiculosModule {}
