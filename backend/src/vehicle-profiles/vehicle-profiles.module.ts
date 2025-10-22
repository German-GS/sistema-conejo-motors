// backend/src/vehicle-profiles/vehicle-profiles.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { VehicleProfilesController } from './vehicle-profiles.controller';
import { VehicleProfile } from './vehicle-profile.entity';
// --- 👇 IMPORTAR LA NUEVA ENTIDAD 👇 ---
import { VehicleProfileImage } from './vehicle-profile-image.entity';
import { MulterModule } from '@nestjs/platform-express'; // Asegúrate de tenerlo importado si vas a subir archivos

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleProfile,
      // --- 👇 AÑADIR LA NUEVA ENTIDAD AQUÍ 👇 ---
      VehicleProfileImage,
    ]),
    MulterModule.register({
      dest: './uploads', // Directorio temporal para las subidas
    }),
  ],
  controllers: [VehicleProfilesController],
  providers: [VehicleProfilesService],
  exports: [VehicleProfilesService], // Asegúrate de exportar el servicio si otros módulos lo usan
})
export class VehicleProfilesModule {}
