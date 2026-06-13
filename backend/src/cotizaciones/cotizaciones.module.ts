import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cotizacion } from './cotizacion.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { ClientesModule } from '../clientes/clientes.module';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleEstadoHistorial } from '../vehicles/vehicle-estado-historial.entity';
import { Lead } from '../leads/lead.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cotizacion, Vehicle, VehicleEstadoHistorial, Lead]),
    ClientesModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
