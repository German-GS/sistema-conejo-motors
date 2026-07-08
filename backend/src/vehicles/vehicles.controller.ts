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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { VehiclesImportService } from './vehicles-import.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehiclesImportService: VehiclesImportService,
  ) {}

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

  @Patch(':id/visibility')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  updateVisibility(
    @Param('id') id: string,
    @Body() body: { visibilidad: 'Visible' | 'Oculto' | 'Agotado' | 'Contrapedido' },
  ) {
    return this.vehiclesService.updateVisibility(+id, body.visibilidad);
  }

  @Patch(':id/clasificacion')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  updateClasificacion(
    @Param('id') id: string,
    @Body() body: { clasificacion: 'En Stock' | 'Agotado' | 'Contrapedido' | 'No Comercial' },
  ) {
    return this.vehiclesService.updateClasificacion(+id, body.clasificacion);
  }

  /** Marca el vehículo como Demo / uso interno (Activo Fijo, no para venta). */
  @Patch(':id/demo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  marcarDemo(@Param('id') id: string, @Req() req: any) {
    return this.vehiclesService.marcarDemo(+id, req.user?.id);
  }

  /** Edita datos del vehículo demo/uso interno (placa, marchamo, vida útil, residual). */
  @Patch(':id/demo-datos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador', 'Contador')
  actualizarDatosDemo(
    @Param('id') id: string,
    @Body() body: { placa?: string | null; marchamo?: number; valor_residual_demo?: number; vida_util_meses_demo?: number },
  ) {
    return this.vehiclesService.actualizarDatosDemo(+id, body);
  }

  /** Regresa un vehículo Demo al inventario de venta. */
  @Patch(':id/quitar-demo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  quitarDemo(@Param('id') id: string, @Req() req: any) {
    return this.vehiclesService.quitarDemo(+id, req.user?.id);
  }

  /** Carga inicial contable del inventario de vehículos en stock (asiento de apertura). */
  @Post('inventario/carga-inicial')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  cargarInventarioInicial(@Req() req: any) {
    return this.vehiclesService.cargarInventarioInicial(req.user?.id);
  }

  @Patch(':id/pricing')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  updatePricing(
    @Param('id') id: string,
    @Body() body: { precio_venta?: number; precio_venta_usd?: number; descuento_porcentaje?: number },
  ) {
    return this.vehiclesService.updatePricing(+id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(+id);
  }

  /** PATCH /vehicles/:id/liberar — Admin libera un vehículo reservado */
  @Patch(':id/liberar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  liberarVehiculo(@Param('id') id: string) {
    return this.vehiclesService.liberarVehiculo(+id);
  }

  /** GET /vehicles/reservados — Admin: vehículos reservados con info de cotización */
  @Get('reservados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador', 'Contador')
  getReservados() {
    return this.vehiclesService.getReservados();
  }

  @Get('dashboard/stats')
  @UseGuards(AuthGuard('jwt'))
  getDashboardStats() {
    return this.vehiclesService.getDashboardStats();
  }

  @Get('dashboard/extended')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador', 'Contador')
  getAdminDashboardExtended() {
    return this.vehiclesService.getAdminDashboardExtended();
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

  @Get(':id/historial')
  @UseGuards(AuthGuard('jwt'))
  getHistorial(@Param('id') id: string) {
    return this.vehiclesService.getHistorial(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }

  // --- IMPORTACIÓN DESDE EXCEL ---

  @Post('import/preview')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No se recibió ningún archivo.');
    return this.vehiclesImportService.parseExcel(file.buffer);
  }

  @Post('import/confirm')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  confirmImport(@Body() body: { rows: any[] }) {
    return this.vehiclesImportService.importRows(body.rows);
  }
}