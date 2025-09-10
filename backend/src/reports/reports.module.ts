import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Venta } from '../ventas/venta.entity';
import { Vehicle } from '../vehicles/vehicle.entity'; // <-- Importar Vehicle

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Vehicle])], // <-- Añadir Vehicle
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
