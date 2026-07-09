import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { LineaCompra } from './linea-compra.entity';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenCompra, LineaCompra]), ContabilidadModule],
  controllers: [ComprasController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
