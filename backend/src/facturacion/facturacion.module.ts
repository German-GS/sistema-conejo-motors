// backend/src/facturacion/facturacion.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturacionService } from './facturacion.service';
import { FacturacionController } from './facturacion.controller';
import { Factura } from './factura.entity';
import { Venta } from '../ventas/venta.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Venta, Cotizacion, Vehicle]),
  ],
  providers: [FacturacionService],
  controllers: [FacturacionController],
})
export class FacturacionModule {}