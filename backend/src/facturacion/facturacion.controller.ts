import {
  Controller, Get, Post, Body, Query, Param,
  UseGuards, Request, ParseIntPipe, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FacturacionService } from './facturacion.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FacturacionController {
  constructor(private readonly svc: FacturacionService) {}

  /** GET /billing/pending — cotizaciones listas para facturar */
  @Get('pending')
  @Roles('Administrador', 'Contador', 'Vendedor')
  getPending() {
    return this.svc.getPendingInvoices();
  }

  /** GET /billing/buscar?q=cedula — buscar cotizaciones por cliente */
  @Get('buscar')
  @Roles('Administrador', 'Contador', 'Vendedor')
  buscar(@Query('q') q: string) {
    return this.svc.buscarCotizacionesCliente(q ?? '');
  }

  /** GET /billing/cotizacion/:id — detalle completo de una cotización */
  @Get('cotizacion/:id')
  @Roles('Administrador', 'Contador', 'Vendedor')
  detalle(@Query('id', ParseIntPipe) id: number) {
    return this.svc.getDetalleCotizacion(id);
  }

  /** GET /billing/ventas — historial de ventas completadas */
  @Get('ventas')
  @Roles('Administrador', 'Contador', 'Vendedor')
  getVentas() {
    return this.svc.getVentas();
  }

  /**
   * POST /billing/solicitar — vendedor solicita facturación.
   * Notifica a Admins y Contadores sin completar la venta.
   */
  @Post('solicitar')
  @Roles('Administrador', 'Contador', 'Vendedor')
  solicitar(
    @Body() body: { leadId?: number; cotizacionId?: number; nota?: string },
    @Request() req,
  ) {
    return this.svc.solicitarFacturacion(req.user, body);
  }

  /** POST /billing/facturar — procesar factura con datos de facturación */
  @Post('facturar')
  @Roles('Administrador', 'Contador')
  facturar(@Body() body: { cotizacionId: number; datos: any }, @Request() req) {
    return this.svc.facturar(body.cotizacionId, body.datos, req.user);
  }

  /** POST /billing/ventas/:id/comprobante — adjuntar documento de respaldo a la venta */
  @Post('ventas/:id/comprobante')
  @Roles('Administrador', 'Contador')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  subirComprobante(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    return this.svc.subirComprobanteVenta(id, file);
  }

  @Get('ventas/:id/comprobante')
  @Roles('Administrador', 'Contador', 'Vendedor')
  async descargarComprobante(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { venta, buffer } = await this.svc.descargarComprobanteVenta(id);
    res.setHeader('Content-Type', venta.comprobante_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${venta.comprobante_nombre || 'comprobante'}"`);
    res.send(buffer);
  }

  /** POST /billing/create — endpoint legacy (compatibilidad) */
  @Post('create')
  @Roles('Administrador', 'Contador')
  createInvoice(
    @Body('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Request() req,
  ) {
    return this.svc.createInvoiceForSale(cotizacionId, req.user);
  }
}
