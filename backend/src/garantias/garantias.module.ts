import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Garantia } from './garantia.entity';
import { ReclamoGarantia } from './reclamo-garantia.entity';
import { GarantiasService } from './garantias.service';
import { GarantiasController } from './garantias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Garantia, ReclamoGarantia])],
  controllers: [GarantiasController],
  providers: [GarantiasService],
  exports: [GarantiasService],
})
export class GarantiasModule {}
