import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivoFijo } from './activo-fijo.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ActivosFijosService } from './activos-fijos.service';
import { ActivosFijosController } from './activos-fijos.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivoFijo, Vehicle]), ContabilidadModule],
  controllers: [ActivosFijosController],
  providers: [ActivosFijosService],
  exports: [ActivosFijosService],
})
export class ActivosFijosModule {}
