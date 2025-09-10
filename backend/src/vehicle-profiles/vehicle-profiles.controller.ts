import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors, // 👈 1. Importa interceptors
  UploadedFile, // 👈 2. Importa UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // 👈 3. Importa FileInterceptor
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VehicleProfilesService } from './vehicle-profiles.service';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';

@Controller('vehicle-profiles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VehicleProfilesController {
  constructor(private readonly profilesService: VehicleProfilesService) {}

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Post()
  @Roles('Administrador')
  @UseInterceptors(FileInterceptor('logo')) // 👈 4. Intercepta el archivo con el campo 'logo'
  create(
    @Body() createDto: CreateVehicleProfileDto,
    @UploadedFile() file: Express.Multer.File, // 👈 5. Recibe el archivo
  ) {
    // 6. Pasa la ruta del archivo (si existe) al servicio 👇
    return this.profilesService.create(createDto, file?.path);
  }

  @Delete(':id')
  @Roles('Administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.profilesService.remove(id);
  }
}
