// backend/src/vehicle-profiles/vehicle-profiles.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { VehicleProfilesController } from './vehicle-profiles.controller';
import { VehicleProfile } from './vehicle-profile.entity';
import { VehicleProfileImage } from './vehicle-profile-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleProfile, VehicleProfileImage]),
    // Usamos memoria en vez de disco — el controlador sube a GCS
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [VehicleProfilesController],
  providers: [VehicleProfilesService],
  exports: [VehicleProfilesService],
})
export class VehicleProfilesModule {}
