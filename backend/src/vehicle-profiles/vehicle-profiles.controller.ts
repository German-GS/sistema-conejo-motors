// En: src/vehicle-profiles/vehicle-profiles.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Patch
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; // <-- Importa esto
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';

@Controller('vehicle-profiles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VehicleProfilesController {
  constructor(private readonly profilesService: VehicleProfilesService) {}

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Post()
  @Roles('Administrador')
  create(@Body() createDto: CreateVehicleProfileDto) {
    return this.profilesService.create(createDto);
  }

  @Post(':id/upload-images')
  @Roles('Administrador')
  @UseInterceptors(FilesInterceptor('files', 10)) 
  uploadProfileImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {

    return this.profilesService.addImages(
      id,
      files.map((file) => file.path),
    );
  }
  @Patch(':id/images/reorder') // Nueva ruta
  @Roles('Administrador') // Asumiendo rol necesario
  reorderProfileImages(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { images: { id: number; order: number }[] } // Espera un array de {id, order}
  ) {
    return this.profilesService.reorderProfileImages(id, body.images);
  }

  @Delete(':id')
  @Roles('Administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.remove(id);
  }
}