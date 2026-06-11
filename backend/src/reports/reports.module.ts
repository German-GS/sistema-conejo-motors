// backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Venta } from '../ventas/venta.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ReciboPago } from '../recibos_pago/recibo_pago.entity';
import { Lead } from '../leads/lead.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { CierreMes } from './cierre-mes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Vehicle, ReciboPago, Lead, Cotizacion, CierreMes])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}