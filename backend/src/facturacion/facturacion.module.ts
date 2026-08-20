// backend/src/facturacion/facturacion.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { EmisorConfig } from './emisor-config.entity';
import { EmisorConfigService } from './emisor-config.service';
import { FacturaHtmlService } from './factura-html.service';
import { FIRMADOR, HACIENDA_CLIENT } from './firma/firma.interfaces';
import { FirmadorNoop } from './firma/firmador.noop';
import { HaciendaClientNoop } from './firma/hacienda-client.noop';
import { FirmadorReal } from './firma/firmador.real';
import { HaciendaClientReal } from './firma/hacienda-client.real';
import { SecretsService } from './firma/secrets.service';
import { Lead } from '../leads/lead.entity';
import { LeadActividad } from '../leads/lead-actividad.entity';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SugefModule } from '../sugef/sugef.module';
import { TipoCambioModule } from '../tipo-cambio/tipo-cambio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, Venta, Cotizacion, Vehicle, Lead, LeadActividad, CuentaCobrar, ConsecutivoContador, EmisorConfig]),
    HttpModule,
    ContabilidadModule,
    NotificationsModule,
    SugefModule,
    TipoCambioModule,
  ],
  providers: [
    FacturacionService,
    XmlGeneratorService,
    NumeracionService,
    EmisorConfigService,
    FacturaHtmlService,
    SecretsService,
    FirmadorReal,
    HaciendaClientReal,
    // Seams de firma/envío. FACTURACION_FIRMA_REAL=true enchufa las implementaciones
    // reales (XAdES-EPES + API de Hacienda vía @dojocoding/hacienda-sdk); por defecto
    // (false) siguen las NoOp — nada cambia hasta activarlo a propósito. Independiente
    // de FACTURACION_PRODUCCION (que gobierna numeración/situación): se puede probar
    // la firma+envío real contra el ambiente sandbox de Hacienda sin quemar consecutivos.
    {
      provide: FIRMADOR,
      useFactory: (config: ConfigService, real: FirmadorReal, noop: FirmadorNoop) =>
        String(config.get('FACTURACION_FIRMA_REAL') ?? 'false').toLowerCase() === 'true' ? real : noop,
      inject: [ConfigService, FirmadorReal, FirmadorNoop],
    },
    FirmadorNoop,
    {
      provide: HACIENDA_CLIENT,
      useFactory: (config: ConfigService, real: HaciendaClientReal, noop: HaciendaClientNoop) =>
        String(config.get('FACTURACION_FIRMA_REAL') ?? 'false').toLowerCase() === 'true' ? real : noop,
      inject: [ConfigService, HaciendaClientReal, HaciendaClientNoop],
    },
    HaciendaClientNoop,
  ],
  controllers: [FacturacionController],
})
export class FacturacionModule {}