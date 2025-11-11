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
  Req,
  // Quité UploadedFiles y UseInterceptors porque no se usan aquí
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Roles } from '../auth/decorators/roles.decorator';
// Corregido: Se importa 'RolesGuard' (con 's')
import { RolesGuard } from '../auth/guards/roles.guard'; 

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard) 
  @Roles('Administrador') // Corregido: Se usa el string 'Administrador'
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    // Corregido: Tu servicio 'findAll' original no recibe 'search'
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
  @UseGuards(AuthGuard('jwt'), RolesGuard) 
  @Roles('Vendedor', 'Administrador') // Corregido: Se usan strings
  getSalespersonDashboardStats(@Req() req) {
    return this.vehiclesService.getSalespersonDashboardStats(req.user);
  }
  
  // --- MÉTODOS PÚBLICOS (SIN GUARDIANES) ---

  @Get('sales/catalog')
  findCatalog() {
    // Corregido: Este es el método correcto en tu servicio
    return this.vehiclesService.findCatalog();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }

  // Se eliminaron los métodos 'uploadImages' y 'deleteImage' que yo había
  // sugerido incorrectamente y que no existen en tu 'vehicles.service.ts'.
}