import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Factura } from '../facturacion/factura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Cliente, Cotizacion, Factura])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
