import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaChica } from './caja-chica.entity';
import { MovimientoCaja } from './movimiento-caja.entity';
import { CajaChicaService } from './caja-chica.service';
import { CajaChicaController } from './caja-chica.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CajaChica, MovimientoCaja])],
  controllers: [CajaChicaController],
  providers: [CajaChicaService],
  exports: [CajaChicaService],
})
export class CajaChicaModule {}
