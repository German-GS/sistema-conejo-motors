import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asistencia } from './asistencia.entity';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asistencia])],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
  exports: [AsistenciaService],
})
export class AsistenciaModule {}
