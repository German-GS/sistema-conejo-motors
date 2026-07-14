import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TipoCambio } from './tipo-cambio.entity';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CuentaPagar } from '../cxp/cuenta-pagar.entity';
import { TipoCambioService } from './tipo-cambio.service';
import { DiferencialCambiarioService } from './diferencial-cambiario.service';
import { TipoCambioController } from './tipo-cambio.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoCambio, CuentaCobrar, CuentaPagar]),
    HttpModule,
    ContabilidadModule,
  ],
  controllers: [TipoCambioController],
  providers: [TipoCambioService, DiferencialCambiarioService],
  exports: [TipoCambioService],
})
export class TipoCambioModule {}
