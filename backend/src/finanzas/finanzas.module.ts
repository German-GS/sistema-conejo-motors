import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CuentaPagar } from '../cxp/cuenta-pagar.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CuentaCobrar, CuentaPagar, Vehicle]),
    ContabilidadModule,
  ],
  controllers: [FinanzasController],
  providers: [FinanzasService],
})
export class FinanzasModule {}
