import {
  Controller, Get, Post, Put, Body, Query, Param,
  UseGuards, Request, ParseIntPipe, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FacturacionService } from './facturacion.service';
import { EmisorConfigService } from './emisor-config.service';
import { FacturaHtmlService } from './factura-html.service';
import { FacturarDto } from './dto/facturar.dto';
import { EmisorConfigDto } from './dto/emisor-config.dto';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FacturacionController {
  constructor(
    private readonly svc: FacturacionService,
    private readonly emisorConfig: EmisorConfigService,
    private readonly facturaHtml: FacturaHtmlService,
  ) {}

  /** GET /billing/emisor — datos del emisor para la factura electrónica */
  @Get('emisor')
  @Roles('Administrador', 'Contador')
  getEmisor() {
    return this.emisorConfig.get();
  }

  /** PUT /billing/emisor — actualizar datos del emisor */
  @Put('emisor')
  @Roles('Administrador')
  updateEmisor(@Body() body: EmisorConfigDto) {
    return this.emisorConfig.update(body as any);
  }

  /** GET /billing/preview-demo?tipo=factura|tiquete — representación gráfica de ejemplo (borrador) */
  @Get('preview-demo')
  @Roles('Administrador', 'Contador')
  async previewDemo(@Query('tipo') tipo: string, @Res() res: Response) {
    const cfg = await this.emisorConfig.get();
    const t = tipo === 'tiquete' ? 'Tiquete Electrónico' : tipo === 'proforma' ? 'Proforma' : 'Factura Electrónica';
    const doc = this.facturaHtml.demo(cfg, t as any);
    if (t === 'Proforma') doc.borrador = false; // la proforma no es un comprobante fiscal
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.facturaHtml.render(doc));
  }

  /** GET /billing/proforma/:id — representación gráfica de la proforma de una cotización real */
  @Get('proforma/:id')
  @Roles('Administrador', 'Contador', 'Vendedor')
  async proformaCotizacion(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const [cfg, cot] = await Promise.all([
      this.emisorConfig.get(),
      this.svc.getDetalleCotizacion(id),
    ]);
    const doc = this.facturaHtml.proformaCotizacion(cfg, cot);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(this.facturaHtml.render(doc));
  }

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
  facturar(@Body() body: FacturarDto, @Request() req) {
    return this.svc.facturar(body.cotizacionId, body.datos as any, req.user);
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
