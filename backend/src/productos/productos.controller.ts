import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductosService } from './productos.service';

@Controller('productos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductosController {
  constructor(private readonly svc: ProductosService) {}

  // ── Catálogo público de productos ─────────────────────────────────────────

  @Get()
  @Roles('Administrador', 'Vendedor', 'Contador')
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Get('admin/all')
  @Roles('Administrador', 'Contador')
  findAllAdmin() {
    return this.svc.findAllAdmin();
  }

  @Get('stats')
  @Roles('Administrador', 'Contador')
  getStats() {
    return this.svc.getStats();
  }

  @Get('stock-bajo')
  @Roles('Administrador', 'Contador')
  getStockBajo() {
    return this.svc.getStockBajo();
  }

  @Get(':id')
  @Roles('Administrador', 'Vendedor', 'Contador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('Administrador')
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Patch(':id')
  @Roles('Administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Patch(':id/stock')
  @Roles('Administrador')
  ajustarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { delta: number; motivo?: string },
  ) {
    return this.svc.ajustarStock(id, body.delta, body.motivo);
  }

  // ── Órdenes de venta ──────────────────────────────────────────────────────

  @Get('ordenes/lista')
  @Roles('Administrador', 'Contador')
  findOrdenes(@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.svc.findOrdenes(limit);
  }

  @Get('ordenes/:id')
  @Roles('Administrador', 'Vendedor', 'Contador')
  findOrden(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOrden(id);
  }

  @Post('ordenes')
  @Roles('Administrador', 'Vendedor')
  crearOrden(@Body() body: any, @Request() req) {
    return this.svc.crearOrden(req.user, body);
  }

  @Patch('ordenes/:id/anular')
  @Roles('Administrador')
  anularOrden(@Param('id', ParseIntPipe) id: number) {
    return this.svc.anularOrden(id);
  }
}
