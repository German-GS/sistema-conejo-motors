import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaContable } from './cuenta.entity';
import { AsientoContable, LineaAsiento } from './asiento.entity';
import { CierreDiario } from './cierre-diario.entity';
import { CierrePeriodo } from './cierre-periodo.entity';
import { ContabilidadController } from './contabilidad.controller';
import { ContabilidadService } from './contabilidad.service';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaContable, AsientoContable, LineaAsiento, CierreDiario, CierrePeriodo])],
  controllers: [ContabilidadController],
  providers: [ContabilidadService],
  exports: [ContabilidadService],
})
export class ContabilidadModule {}
