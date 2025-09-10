import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cotizacion } from './cotizacion.entity';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { ClientesModule } from '../clientes/clientes.module'; // 👈 Importa ClientesModule
import { Vehicle } from '../vehicles/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cotizacion, Vehicle]), // 👈 Añade Vehicle
    ClientesModule, // 👈 Añade ClientesModule
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
