import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClientesService } from './clientes.service';

@Controller('clientes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientesController {
  constructor(private readonly svc: ClientesService) {}

  @Get()
  @Roles('Vendedor', 'Administrador', 'Contador')
  listar() {
    return this.svc.listar();
  }

  @Get(':id')
  @Roles('Vendedor', 'Administrador', 'Contador')
  perfil(@Param('id', ParseIntPipe) id: number) {
    return this.svc.perfil(id);
  }
}
