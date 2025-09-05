import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePlanillaParametroDto } from './dto/create-planilla-parametro.dto';
import { UpdatePlanillaParametroDto } from './dto/update-planilla-parametro.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('planilla-parametros')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlanillaParametrosController {
  constructor(
    private readonly planillaParametrosService: PlanillaParametrosService,
  ) {}

  @Post()
  create(@Body() createPlanillaParametroDto: CreatePlanillaParametroDto) {
    // Solución: Llama al método sin argumentos.
    return this.planillaParametrosService.create();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planillaParametrosService.findOne(+id);
  }

  @Get()
  @Roles('Administrador') // Solo los admins pueden ver
  findAll() {
    return this.planillaParametrosService.findAll();
  }

  @Patch(':id')
  @Roles('Administrador') // Solo los admins pueden editar
  update(
    @Param('id') id: string,
    @Body() updatePlanillaParametroDto: UpdatePlanillaParametroDto,
  ) {
    return this.planillaParametrosService.update(
      +id,
      updatePlanillaParametroDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planillaParametrosService.remove(+id);
  }
}
