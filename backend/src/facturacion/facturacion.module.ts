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
import { Lead } from '../leads/lead.entity';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Venta, Cotizacion, Vehicle, Lead, CuentaCobrar]),
    HttpModule,
    ContabilidadModule,
    NotificationsModule,
  ],
  providers: [FacturacionService, CryptoService, XmlGeneratorService],
  controllers: [FacturacionController],
})
export class FacturacionModule {}