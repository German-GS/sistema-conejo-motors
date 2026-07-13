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
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { EstadosFinancierosService } from './estados-financieros.service';
import { EstadosFinancierosController } from './estados-financieros.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Vehicle, ReciboPago, Lead, Cotizacion, CierreMes]),
    ContabilidadModule,
  ],
  controllers: [ReportsController, EstadosFinancierosController],
  providers: [ReportsService, EstadosFinancierosService],
})
export class ReportsModule {}