import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gasto } from './gasto.entity';
import { GastosService } from './gastos.service';
import { GastosController } from './gastos.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Gasto]), ContabilidadModule, SiteSettingsModule],
  controllers: [GastosController],
  providers: [GastosService],
  exports: [GastosService],
})
export class GastosModule {}
