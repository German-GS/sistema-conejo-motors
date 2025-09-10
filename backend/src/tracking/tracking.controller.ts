// 1. Importa 'UseGuards' y 'AuthGuard'
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrackingService } from './tracking.service';

@Controller('tracking')
@UseGuards(AuthGuard('jwt')) // 2. Añade esta línea para proteger todas las rutas del controlador
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  create(@Body() body: { vehicleId: number; destination: string }, @Req() req) {
    // Ahora 'req.user' sí existirá y tendrá el 'id'
    const userId = req.user.id;
    return this.trackingService.create(
      body.vehicleId,
      body.destination,
      userId,
    );
  }

  @Get('vehicle/:id/latest-log')
  getLatestLog(@Param('id') id: string) {
    return this.trackingService.getLatestLogForVehicle(+id);
  }
}
