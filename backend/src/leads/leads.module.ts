// backend/src/leads/leads.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadActividad } from './lead-actividad.entity';
import { LeadFinanciamiento } from './lead-financiamiento.entity';
import { LeadDocumento } from './lead-documento.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Campana } from '../campanas/campana.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { LeadsController } from './leads.controller';
import { LeadDocumentosController } from './lead-documentos.controller';
import { LeadsService } from './leads.service';
import { LeadDocumentosService } from './lead-documentos.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadActividad, LeadFinanciamiento, LeadDocumento, User, Vehicle, Campana, Cotizacion]),
    NotificationsModule,
  ],
  controllers: [LeadsController, LeadDocumentosController],
  providers: [LeadsService, LeadDocumentosService],
  exports: [LeadsService],
})
export class LeadsModule {}
