import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Cotizacion, Vehicle])],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
