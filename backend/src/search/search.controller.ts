import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  buscar(@Query('q') q: string) {
    return this.service.buscar(q);
  }
}
