import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaFiscal } from './nota-fiscal.entity';
import { NotasFiscalesService } from './notas-fiscales.service';
import { NotasFiscalesController } from './notas-fiscales.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [TypeOrmModule.forFeature([NotaFiscal]), ContabilidadModule],
  controllers: [NotasFiscalesController],
  providers: [NotasFiscalesService],
  exports: [NotasFiscalesService],
})
export class NotasFiscalesModule {}
