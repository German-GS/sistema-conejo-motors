import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaPagar } from './cuenta-pagar.entity';
import { PagoCxP } from './pago-cxp.entity';
import { CxpService } from './cxp.service';
import { CxpController } from './cxp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaPagar, PagoCxP])],
  controllers: [CxpController],
  providers: [CxpService],
  exports: [CxpService],
})
export class CxpModule {}
