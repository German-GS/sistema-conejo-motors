import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanzasService } from './finanzas.service';

@Controller('finanzas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class FinanzasController {
  constructor(private readonly service: FinanzasService) {}

  @Get('resumen')
  getResumen() {
    return this.service.getResumen();
  }

  @Get('checklist-cierre')
  getChecklistCierre() {
    return this.service.getChecklistCierre();
  }
}
