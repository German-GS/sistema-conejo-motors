import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobrar } from './cuenta-cobrar.entity';
import { PagoCxC } from './pago-cxc.entity';
import { CxcService } from './cxc.service';
import { CxcController } from './cxc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaCobrar, PagoCxC])],
  controllers: [CxcController],
  providers: [CxcService],
  exports: [CxcService],
})
export class CxcModule {}
