import { Test, TestingModule } from '@nestjs/testing';
import { RecibosPagoService } from './recibos_pago.service';

describe('RecibosPagoService', () => {
  let service: RecibosPagoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecibosPagoService],
    }).compile();

    service = module.get<RecibosPagoService>(RecibosPagoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
