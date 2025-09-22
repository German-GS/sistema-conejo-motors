// backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Venta } from '../ventas/venta.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ReciboPago } from '../recibos_pago/recibo_pago.entity'; // <-- Importar ReciboPago

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Vehicle, ReciboPago])], // <-- Añadir ReciboPago
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}