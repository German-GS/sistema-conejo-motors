import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingHistory } from './tracking.entity';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { Vehicle } from '../vehicles/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingHistory, Vehicle])],
  providers: [TrackingService],
  controllers: [TrackingController],
})
export class TrackingModule {}
