// backend/src/leads/leads.controller.ts
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Patch,
  Body,
  Post, // 👈 1. Importa 'Post'
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { CreateLeadDto } from './dto/create-lead.dto'; // 👈 2. Importa el DTO

@Controller('leads')
// ❌ NO toques el @UseGuards de aquí
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ... (los métodos existentes Get, Patch, etc., se quedan como están)

  // Ruta para que un vendedor obtenga SUS leads asignados
  @Get('my-leads')
  @Roles('Vendedor', 'Administrador')
  findMyLeads(@Request() req) {
    return this.leadsService.findLeadsForSeller(req.user.id);
  }

  // Ruta para obtener los detalles de UN lead específico
  @Get(':id')
  @Roles('Vendedor', 'Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.findOne(id);
  }

  // Ruta para actualizar el estado de un lead
  @Patch(':id/status')
  @Roles('Vendedor', 'Administrador')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, updateLeadStatusDto);
  }
}