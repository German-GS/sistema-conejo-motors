import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cotizacion } from './cotizacion.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { ClientesModule } from '../clientes/clientes.module';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleEstadoHistorial } from '../vehicles/vehicle-estado-historial.entity';
import { Lead } from '../leads/lead.entity';
import { LeadActividad } from '../leads/lead-actividad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cotizacion, Vehicle, VehicleEstadoHistorial, Lead, LeadActividad]),
    ClientesModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
