import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('roles')
@UseGuards(AuthGuard('jwt')) // Protegemos todas las rutas de roles
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  create(@Body() body: { nombre: string; descripcion: string }) {
    return this.rolesService.create(body.nombre, body.descripcion);
  }
}
