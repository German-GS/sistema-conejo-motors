// backend/src/recibos_pago/recibos_pago.module.ts
import { Module } from '@nestjs/common';
import { RecibosPagoService } from './recibos_pago.service';
import { RecibosPagoController } from './recibos_pago.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReciboPago } from './recibo_pago.entity';
import { PlanillaParametrosModule } from '../planilla-parametros/planilla-parametros.module';
import { UsersModule } from '../users/users.module';
import { PlanillaCalculationService } from './planilla-calculation.service';
import { PlanillaParametrosService } from '../planilla-parametros/planilla-parametros.service';
import { Salario } from '../salarios/salario.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReciboPago, Salario]),
    // Hacemos que los servicios de otros módulos estén disponibles aquí
    PlanillaParametrosModule,
    UsersModule,
    AuditLogsModule,
  ],
  providers: [
    RecibosPagoService,
    // Registramos el servicio de cálculo para que pueda ser inyectado
    PlanillaCalculationService,
  ],
  controllers: [RecibosPagoController],
})
export class RecibosPagoModule {}
