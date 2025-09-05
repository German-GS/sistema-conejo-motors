import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm'; // <-- 1. IMPORTAR
import { Role } from './role.entity'; // <-- 2. IMPORTAR

@Module({
  imports: [TypeOrmModule.forFeature([Role])], // <-- 3. AÑADIR ESTA LÍNEA
  providers: [RolesService],
  controllers: [RolesController],
})
export class RolesModule {}
