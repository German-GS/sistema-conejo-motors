import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bodega } from './bodega.entity';
import { BodegasService } from './bodegas.service';
import { BodegasController } from './bodegas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bodega])],
  controllers: [BodegasController],
  providers: [BodegasService],
})
export class BodegasModule {}
