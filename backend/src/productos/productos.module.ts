import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { OrdenProducto, LineaOrden } from './orden-producto.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, OrdenProducto, LineaOrden]),
    ContabilidadModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
