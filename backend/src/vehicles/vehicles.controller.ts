// backend/src/vehicles/vehicles.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('vehicles')
@UseGuards(AuthGuard('jwt'))
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(+id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(+id);
  }

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.vehiclesService.getDashboardStats();
  }

  @Patch(':id/images')
  updateImagesOrder(
    @Param('id') id: string,
    @Body()
    body: {
      imagesToUpdate: { id: number; order: number }[];
      idsToDelete: number[];
    },
  ) {
    return this.vehiclesService.updateImages(
      +id,
      body.imagesToUpdate,
      body.idsToDelete,
    );
  }

  @Post(':id/upload')
  @UseInterceptors(FilesInterceptor('files', 7)) // 1. Cambia a FilesInterceptor, 'files' es el nombre del campo, 7 es el máximo
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>, // 2. Cambia a @UploadedFiles y espera un Array
  ) {
    return this.vehiclesService.addImages(
      +id,
      files.map((file) => file.path),
    );
  }
}
