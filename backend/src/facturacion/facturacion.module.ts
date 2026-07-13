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

import { XmlGeneratorService } from './xml-generator.service';
import { NumeracionService } from './numeracion.service';
import { ConsecutivoContador } from './consecutivo-contador.entity';
import { FIRMADOR, HACIENDA_CLIENT } from './firma/firma.interfaces';
import { FirmadorNoop } from './firma/firmador.noop';
import { HaciendaClientNoop } from './firma/hacienda-client.noop';
import { Lead } from '../leads/lead.entity';
import { LeadActividad } from '../leads/lead-actividad.entity';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SugefModule } from '../sugef/sugef.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Venta, Cotizacion, Vehicle, Lead, LeadActividad, CuentaCobrar, ConsecutivoContador]),
    HttpModule,
    ContabilidadModule,
    NotificationsModule,
    SugefModule,
  ],
  providers: [
    FacturacionService,
    XmlGeneratorService,
    NumeracionService,
    // Seams de firma/envío. Reemplazar por las implementaciones reales al recibir el .p12.
    { provide: FIRMADOR, useClass: FirmadorNoop },
    { provide: HACIENDA_CLIENT, useClass: HaciendaClientNoop },
  ],
  controllers: [FacturacionController],
})
export class FacturacionModule {}