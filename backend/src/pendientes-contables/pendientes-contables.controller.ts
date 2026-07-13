import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PendientesContablesService } from './pendientes-contables.service';

@Controller('pendientes-contables')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class PendientesContablesController {
  constructor(private readonly svc: PendientesContablesService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }
}
