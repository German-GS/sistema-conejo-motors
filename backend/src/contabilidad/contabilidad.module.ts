import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaContable } from './cuenta.entity';
import { AsientoContable, LineaAsiento } from './asiento.entity';
import { CierreDiario } from './cierre-diario.entity';
import { CierrePeriodo } from './cierre-periodo.entity';
import { ContabilidadController } from './contabilidad.controller';
import { ContabilidadService } from './contabilidad.service';
import { SiteSettingsModule } from '../site-settings/site-settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaContable, AsientoContable, LineaAsiento, CierreDiario, CierrePeriodo]), SiteSettingsModule],
  controllers: [ContabilidadController],
  providers: [ContabilidadService],
  exports: [ContabilidadService],
})
export class ContabilidadModule {}
