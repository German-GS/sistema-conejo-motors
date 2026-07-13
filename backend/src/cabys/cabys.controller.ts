import {
  Controller, Get, Post, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CabysService } from './cabys.service';

@Controller('cabys')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CabysController {
  constructor(private readonly svc: CabysService) {}

  /** Autocompletar por código (prefijo) o descripción. */
  @Get('buscar')
  buscar(@Query('q') q: string) {
    return this.svc.buscar(q);
  }

  @Get('estado')
  async estado() {
    return { total: await this.svc.total() };
  }

  @Get(':codigo')
  validar(@Param('codigo') codigo: string) {
    return this.svc.validar(codigo);
  }

  /** Carga el catálogo completo desde el Excel oficial (BCCR/Hacienda). Solo Admin. */
  @Post('importar')
  @Roles('Administrador')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } }))
  importar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió el archivo del catálogo.');
    return this.svc.importarExcel(file.buffer);
  }
}
