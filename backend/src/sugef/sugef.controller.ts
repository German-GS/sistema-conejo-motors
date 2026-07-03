import {
  Controller, Get, Patch, Param, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SugefService } from './sugef.service';

/** Endpoint global para el badge de la lista de leads */
@Controller('sugef')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SugefEstadosController {
  constructor(private readonly svc: SugefService) {}

  @Get('estados')
  @Roles('Vendedor', 'Administrador')
  estados() {
    return this.svc.estadosLote();
  }
}

@Controller('leads/:leadId/sugef')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SugefController {
  constructor(private readonly svc: SugefService) {}

  /** GET /leads/:leadId/sugef — expediente KYC + estado de retención + faltantes */
  @Get()
  @Roles('Vendedor', 'Administrador')
  async get(@Param('leadId', ParseIntPipe) leadId: number) {
    const kyc = await this.svc.getKyc(leadId);
    const retencion = await this.svc.getRetencion(leadId);
    const bajoRetencion = await this.svc.estaBajoRetencion(leadId);
    return {
      kyc,
      faltantes: this.svc.faltantesKyc(kyc),
      retencion,
      bajoRetencion,
    };
  }

  /** PATCH /leads/:leadId/sugef — guardar campos KYC (onBlur). Bloqueado si hay retención. */
  @Patch()
  @Roles('Vendedor', 'Administrador')
  async update(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Body() body: any,
  ) {
    const kyc = await this.svc.upsertKyc(leadId, body);
    return { kyc, faltantes: this.svc.faltantesKyc(kyc) };
  }
}
