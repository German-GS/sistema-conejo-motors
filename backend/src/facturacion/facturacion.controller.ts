// backend/src/facturacion/facturacion.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FacturacionService } from './facturacion.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador') // Solo los administradores pueden acceder a este módulo
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  // Endpoint para obtener la lista de cotizaciones aceptadas (pendientes de facturar)
  @Get('pending')
  getPendingInvoices() {
    return this.facturacionService.getPendingInvoices();
  }

  // Endpoint para crear la factura de una cotización específica
  @Post('create')
  createInvoice(
    @Body('cotizacionId', ParseIntPipe) cotizacionId: number,
    @Request() req,
  ) {
    // Pasamos el usuario admin para un posible registro en el futuro
    return this.facturacionService.createInvoiceForSale(cotizacionId, req.user);
  }
}