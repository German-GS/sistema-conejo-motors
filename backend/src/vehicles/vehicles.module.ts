// src/vehicles/vehicles.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleImage } from './vehicle-image.entity';
import { MulterModule } from '@nestjs/platform-express';
import { Bodega } from '../bodegas/bodega.entity';
import { Venta } from '../ventas/venta.entity';
// --- 👇 AÑADE ESTOS DOS IMPORTS 👇 ---
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';
import { Lead } from '../leads/lead.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,
      VehicleImage,
      Bodega,
      Venta,
      Cotizacion,
      PlanillaParametro,
      Lead
    ]),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
