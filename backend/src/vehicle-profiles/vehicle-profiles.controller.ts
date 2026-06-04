// backend/src/vehicle-profiles/vehicle-profiles.controller.ts
import {
  Controller, Get, Post, Body, Delete,
  Param, ParseIntPipe, UseGuards,
  UseInterceptors, UploadedFiles, Patch
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';
import { UpdateVehicleProfileDto } from './dto/update-vehicle-profile.dto';

@Controller('vehicle-profiles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VehicleProfilesController {
  constructor(private readonly profilesService: VehicleProfilesService) {}

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  /** GET /vehicle-profiles/:id — detalle con imagenes */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.findOneWithImages(id);
  }

  @Post()
  @Roles('Administrador')
  create(@Body() createDto: CreateVehicleProfileDto) {
    return this.profilesService.create(createDto);
  }

  /** PATCH /vehicle-profiles/:id — actualizar specs del perfil */
  @Patch(':id')
  @Roles('Administrador')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateVehicleProfileDto,
  ) {
    return this.profilesService.updateSpecs(id, updateDto);
  }

  /** POST /vehicle-profiles/:id/upload-images — subir nuevas imágenes */
  @Post(':id/upload-images')
  @Roles('Administrador')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadProfileImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.profilesService.addImages(
      id,
      files.map((f) => f.path),
    );
  }

  /** DELETE /vehicle-profiles/:id/images/:imageId — borrar imagen individual */
  @Delete(':id/images/:imageId')
  @Roles('Administrador')
  deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.profilesService.deleteImage(id, imageId);
  }

  @Patch(':id/images/reorder')
  @Roles('Administrador')
  reorderProfileImages(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { images: { id: number; order: number }[] },
  ) {
    return this.profilesService.reorderProfileImages(id, body.images);
  }

  @Delete(':id')
  @Roles('Administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.remove(id);
  }
}
