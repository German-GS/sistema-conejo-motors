import { Controller, Get, Post, Body } from '@nestjs/common'; // 👈 1. Importa Post y Body
import { AppService } from './app.service';
import { LeadsService } from './leads/leads.service'; // 👈 2. Importa LeadsService
import { CreateLeadDto } from './leads/dto/create-lead.dto'; // 👈 3. Importa el DTO

@Controller()
export class AppController {
  // 👇 4. Inyecta el LeadsService en el constructor
  constructor(
    private readonly appService: AppService,
    private readonly leadsService: LeadsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- 👇 5. AÑADE ESTE MÉTODO PÚBLICO COMPLETO ---
  /**
   * Endpoint público para la creación de leads desde el sitio web.
   */
  @Post('leads') // La ruta será la misma: /leads
  createPublicLead(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }
  // --------------------------------------------------
}