import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccesorioVehiculo } from './accesorio.entity';
import { AccesoriosService } from './accesorios.service';
import { AccesoriosController } from './accesorios.controller';
import { Vehicle } from '../vehicles/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccesorioVehiculo, Vehicle])],
  controllers: [AccesoriosController],
  providers: [AccesoriosService],
  exports: [AccesoriosService],
})
export class AccesoriosModule {}
