import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { MovimientoBancario } from './movimiento-bancario.entity';
import { TesoreriaService } from './tesoreria.service';
import { TesoreriaController } from './tesoreria.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaBancaria, MovimientoBancario])],
  controllers: [TesoreriaController],
  providers: [TesoreriaService],
  exports: [TesoreriaService],
})
export class TesoreriaModule {}
