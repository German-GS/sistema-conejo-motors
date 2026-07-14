import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { MovimientoBancario } from './movimiento-bancario.entity';
import { TesoreriaService } from './tesoreria.service';
import { TesoreriaController } from './tesoreria.controller';
import { ConciliacionService } from './conciliacion.service';
import { ConciliacionController } from './conciliacion.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaBancaria, MovimientoBancario]), ContabilidadModule],
  controllers: [TesoreriaController, ConciliacionController],
  providers: [TesoreriaService, ConciliacionService],
  exports: [TesoreriaService],
})
export class TesoreriaModule {}
