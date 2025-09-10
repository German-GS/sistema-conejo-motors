import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Cotizacion, Vehicle]), // <-- Añade una coma aquí
    NotificationsModule,
  ],

  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
