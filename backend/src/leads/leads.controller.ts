// backend/src/leads/leads.controller.ts
import {
  Controller, Get, Param, ParseIntPipe, UseGuards,
  Request, Patch, Body, Post, Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /** Admin: todos los leads */
  @Get()
  @Roles('Administrador')
  findAll() {
    return this.leadsService.findAll();
  }

  /** Vendedor/Admin: leads propios */
  @Get('my-leads')
  @Roles('Vendedor', 'Administrador')
  findMyLeads(@Request() req) {
    return this.leadsService.findLeadsForSeller(req.user.id);
  }

  /** Conteo de follow-ups vencidos para badge en el menú */
  @Get('followup/overdue-count')
  @Roles('Vendedor', 'Administrador')
  getOverdueCount(@Request() req) {
    return this.leadsService.getOverdueFollowupCount(req.user);
  }

  /** Detalle de un lead (con actividades) */
  @Get(':id')
  @Roles('Vendedor', 'Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.findOne(id);
  }

  /** Actualización completa del lead (estado, fuente, notas, followup, reasignar) */
  @Patch(':id')
  @Roles('Vendedor', 'Administrador')
  updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @Request() req,
  ) {
    return this.leadsService.updateLead(id, dto, req.user);
  }

  /** Compatibilidad con el endpoint anterior */
  @Patch(':id/status')
  @Roles('Vendedor', 'Administrador')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, dto);
  }

  /** Agregar actividad al historial */
  @Post(':id/actividades')
  @Roles('Vendedor', 'Administrador')
  addActividad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateActividadDto,
    @Request() req,
  ) {
    return this.leadsService.addActividad(id, dto, req.user);
  }

  /** Eliminar lead permanentemente (solo admin) */
  @Delete(':id')
  @Roles('Administrador')
  eliminarLead(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.eliminarLead(id);
  }

  // ── FINANCIAMIENTO ────────────────────────────────────────────────────────

  /** GET /leads/:id/financiamientos — lista de entidades bancarias del lead */
  @Get(':id/financiamientos')
  @Roles('Vendedor', 'Administrador')
  getFinanciamientos(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.getFinanciamientos(id);
  }

  /** POST /leads/:id/financiamientos — crear o actualizar registro de una entidad */
  @Post(':id/financiamientos')
  @Roles('Vendedor', 'Administrador')
  upsertFinanciamiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.leadsService.upsertFinanciamiento(id, body);
  }

  /** DELETE /leads/:id/financiamientos/:fid — eliminar registro de entidad */
  @Delete(':id/financiamientos/:fid')
  @Roles('Vendedor', 'Administrador')
  deleteFinanciamiento(
    @Param('id', ParseIntPipe) id: number,
    @Param('fid', ParseIntPipe) fid: number,
  ) {
    return this.leadsService.deleteFinanciamiento(id, fid);
  }
}
