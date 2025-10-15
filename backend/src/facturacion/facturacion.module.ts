// backend/src/facturacion/facturacion.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { FacturacionService } from './facturacion.service';
import { FacturacionController } from './facturacion.controller';
import { Factura } from './factura.entity';
import { Venta } from '../ventas/venta.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

// --- 👇 1. Importa los nuevos servicios 👇 ---
import { CryptoService } from './crypto.service';
import { XmlGeneratorService } from './xml-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Venta, Cotizacion, Vehicle]),
    HttpModule,
  ],
  // --- 👇 2. Añádelos a la lista de 'providers' 👇 ---
  providers: [FacturacionService, CryptoService, XmlGeneratorService],
  controllers: [FacturacionController],
})
export class FacturacionModule {}