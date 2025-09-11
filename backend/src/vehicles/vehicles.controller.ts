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
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vehicles')
// Se elimina el @UseGuards(AuthGuard('jwt')) de aquí para aplicarlo individualmente
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(+id, updateVehicleDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(+id);
  }

  @Get('dashboard/stats')
  @UseGuards(AuthGuard('jwt'))
  getDashboardStats() {
    return this.vehiclesService.getDashboardStats();
  }

  @Get('dashboard/sales-stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Se añade AuthGuard para que RolesGuard funcione
  @Roles('Vendedor', 'Administrador')
  getSalespersonDashboardStats(@Req() req) {
    return this.vehiclesService.getSalespersonDashboardStats(req.user);
  }

  @Patch(':id/images')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files', 7))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const normalizedPaths = files.map((file) => file.path.replace(/\\/g, '/'));
    return this.vehiclesService.addImages(+id, normalizedPaths);
  }

  // --- MÉTODOS PÚBLICOS (SIN GUARDIANES) ---

  @Get('sales/catalog')
  findCatalog() {
    return this.vehiclesService.findCatalog();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }
}
