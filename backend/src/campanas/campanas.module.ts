import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campana } from './campana.entity';
import { Lead } from '../leads/lead.entity';
import { CampanasService } from './campanas.service';
import { CampanasController } from './campanas.controller';
import { GastosModule } from '../gastos/gastos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campana, Lead]),
    GastosModule,
  ],
  controllers: [CampanasController],
  providers: [CampanasService],
  exports: [CampanasService],
})
export class CampanasModule {}
