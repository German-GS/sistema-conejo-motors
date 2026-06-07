// backend/src/vehicle-profiles/vehicle-profiles.controller.ts
import {
  Controller, Get, Post, Body, Delete,
  Param, ParseIntPipe, UseGuards,
  UseInterceptors, UploadedFiles, Patch,
  InternalServerErrorException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';
import { UpdateVehicleProfileDto } from './dto/update-vehicle-profile.dto';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const GCS_BASE   = `https://storage.googleapis.com/${GCS_BUCKET}`;

// El cliente de GCS usa Application Default Credentials automáticamente
// en Cloud Run (service account del proyecto). Sin config adicional.
const gcsStorage = new Storage();
const bucket     = gcsStorage.bucket(GCS_BUCKET);

async function uploadToGCS(file: Express.Multer.File): Promise<string> {
  const ext      = file.originalname.split('.').pop() ?? 'jpg';
  const filename = `uploads/${uuidv4()}.${ext}`;
  const blob     = bucket.file(filename);

  await blob.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    resumable: false,
  });

  return `${GCS_BASE}/${filename}`;
}

@Controller('vehicle-profiles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VehicleProfilesController {
  constructor(private readonly profilesService: VehicleProfilesService) {}

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  /** GET /vehicle-profiles/:id — detalle con imágenes */
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

  /** POST /vehicle-profiles/:id/upload-images — subir imágenes a GCS */
  @Post(':id/upload-images')
  @Roles('Administrador')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadProfileImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (!files?.length) {
      throw new InternalServerErrorException('No se recibieron archivos.');
    }
    try {
      // Subir todas en paralelo a GCS
      const publicUrls = await Promise.all(files.map(uploadToGCS));
      // Guardar las URLs en la DB
      return this.profilesService.addImages(id, publicUrls);
    } catch (err) {
      console.error('GCS upload error:', err);
      throw new InternalServerErrorException('Error al subir imágenes a GCS.');
    }
  }

  /** DELETE /vehicle-profiles/:id/images/:imageId — borrar imagen */
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
