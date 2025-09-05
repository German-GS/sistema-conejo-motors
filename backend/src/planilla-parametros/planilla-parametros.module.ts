// backend/src/planilla-parametros/planilla-parametros.module.ts
import { Module } from '@nestjs/common';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { PlanillaParametrosController } from './planilla-parametros.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanillaParametro } from './entities/planilla-parametro.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlanillaParametro])],
  controllers: [PlanillaParametrosController],
  providers: [PlanillaParametrosService],
  // 👇 AÑADE ESTA LÍNEA PARA HACER EL SERVICIO PÚBLICO
  exports: [PlanillaParametrosService],
})
export class PlanillaParametrosModule {}
