import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivoFijo } from '../activos-fijos/activo-fijo.entity';
import { LiquidacionIVA } from '../iva/liquidacion-iva.entity';
import { PendientesContablesService } from './pendientes-contables.service';
import { PendientesContablesController } from './pendientes-contables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivoFijo, LiquidacionIVA])],
  controllers: [PendientesContablesController],
  providers: [PendientesContablesService],
})
export class PendientesContablesModule {}
