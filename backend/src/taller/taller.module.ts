import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenTrabajo } from './orden-trabajo.entity';
import { DetalleTaller } from './detalle-taller.entity';
import { TallerService } from './taller.service';
import { TallerController } from './taller.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenTrabajo, DetalleTaller])],
  controllers: [TallerController],
  providers: [TallerService],
  exports: [TallerService],
})
export class TallerModule {}
