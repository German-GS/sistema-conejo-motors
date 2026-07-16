// src/vehicles/vehicles.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { VehicleEstadoHistorial } from './vehicle-estado-historial.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { MulterModule } from '@nestjs/platform-express';
import { Bodega } from '../bodegas/bodega.entity';
import { Venta } from '../ventas/venta.entity';
// --- 👇 AÑADE ESTOS DOS IMPORTS 👇 ---
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { PlanillaParametro } from '../planilla-parametros/entities/planilla-parametro.entity';
import { Lead } from '../leads/lead.entity';
import { VehicleProfile } from '../vehicle-profiles/vehicle-profile.entity';
import { VehiclesImportService } from './vehicles-import.service';
import { AccesorioVehiculo } from '../accesorios/accesorio.entity';
import { OrdenProducto } from '../productos/orden-producto.entity';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [
    ContabilidadModule,
    TypeOrmModule.forFeature([
      Vehicle,
      VehicleEstadoHistorial,
      Bodega,
      Venta,
      Cotizacion,
      PlanillaParametro,
      Lead,
      VehicleProfile,
      AccesorioVehiculo,
      OrdenProducto,
    ]),
    // Archivos temporales de import (CSV/Excel) fuera de la carpeta pública /uploads,
    // para que no queden descargables por URL.
    MulterModule.register({ dest: './tmp-imports' }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesImportService],
})
export class VehiclesModule {}
