import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidacionIVA } from './liquidacion-iva.entity';
import { Venta } from '../ventas/venta.entity';
import { Gasto } from '../gastos/gasto.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { IvaService } from './iva.service';
import { IvaController } from './iva.controller';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiquidacionIVA, Venta, Gasto, Vehicle]),
    ContabilidadModule,
    NotificationsModule,
  ],
  controllers: [IvaController],
  providers: [IvaService],
  exports: [IvaService],
})
export class IvaModule {}
