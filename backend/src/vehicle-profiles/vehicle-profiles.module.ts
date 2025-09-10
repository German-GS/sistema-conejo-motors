import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express'; // 👈 1. Importa MulterModule
import { VehicleProfile } from './vehicle-profile.entity';
import { VehicleProfilesController } from './vehicle-profiles.controller';
import { VehicleProfilesService } from './vehicle-profiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleProfile]),
    // 👇 2. Configura Multer para guardar los logos en 'uploads/logos'
    MulterModule.register({
      dest: './uploads/logos',
    }),
  ],
  controllers: [VehicleProfilesController],
  providers: [VehicleProfilesService],
})
export class VehicleProfilesModule {}
