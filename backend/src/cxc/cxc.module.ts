import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobrar } from './cuenta-cobrar.entity';
import { PagoCxC } from './pago-cxc.entity';
import { CxcService } from './cxc.service';
import { CxcController } from './cxc.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaCobrar, PagoCxC]), ContabilidadModule],
  controllers: [CxcController],
  providers: [CxcService],
  exports: [CxcService],
})
export class CxcModule {}
