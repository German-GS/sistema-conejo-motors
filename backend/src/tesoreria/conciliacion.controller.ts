import {
  Controller, Get, Post, Param, Query, Body, Request,
  UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConciliacionService } from './conciliacion.service';

@Controller('conciliacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ConciliacionController {
  constructor(private readonly svc: ConciliacionService) {}

  /** Importa el estado de cuenta (CSV: fecha,descripcion,monto,referencia). */
  @Post(':cuentaId/importar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importar(
    @Param('cuentaId', ParseIntPipe) cuentaId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('csv') csvBody?: string,
  ) {
    const csv = file ? file.buffer.toString('utf-8') : csvBody;
    if (!csv) throw new BadRequestException('Enviá el CSV como archivo (file) o en el campo csv.');
    return this.svc.importarCSV(cuentaId, csv);
  }

  /** Corre el matching automático del período. */
  @Post(':cuentaId/conciliar')
  conciliar(
    @Param('cuentaId', ParseIntPipe) cuentaId: number,
    @Body() body: { desde: string; hasta: string; tolerancia?: number },
  ) {
    if (!body?.desde || !body?.hasta) throw new BadRequestException('Se requiere desde y hasta.');
    return this.svc.conciliar(cuentaId, body.desde, body.hasta, body.tolerancia ?? 3);
  }

  /** Reporte de conciliación (saldo libros vs. banco + partidas). */
  @Get(':cuentaId/reporte')
  reporte(
    @Param('cuentaId', ParseIntPipe) cuentaId: number,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    if (!desde || !hasta) throw new BadRequestException('Se requiere desde y hasta.');
    return this.svc.reporte(cuentaId, desde, hasta);
  }

  /** Crea el asiento faltante de un movimiento en banco no en libros (comisión/interés). */
  @Post('movimiento/:id/asiento')
  crearAsiento(@Param('id', ParseIntPipe) id: number, @Request() req, @Body('cuentaGasto') cuentaGasto?: string) {
    return this.svc.crearAsientoAjuste(id, req.user, cuentaGasto || '5600');
  }
}
