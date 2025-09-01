import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleImage } from './vehicle-image.entity';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleImage]),
    MulterModule.register({
      dest: './uploads', // Directorio donde se guardarán las imágenes
    }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
