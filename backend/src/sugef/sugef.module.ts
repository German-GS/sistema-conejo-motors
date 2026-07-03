import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadSugefKyc } from './lead-sugef-kyc.entity';
import { LeadSugefRetencion } from './lead-sugef-retencion.entity';
import { SugefService } from './sugef.service';
import { SugefController, SugefEstadosController } from './sugef.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeadSugefKyc, LeadSugefRetencion])],
  controllers: [SugefController, SugefEstadosController],
  providers: [SugefService],
  exports: [SugefService],
})
export class SugefModule {}
