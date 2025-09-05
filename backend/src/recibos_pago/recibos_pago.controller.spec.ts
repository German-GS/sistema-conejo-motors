import { Test, TestingModule } from '@nestjs/testing';
import { RecibosPagoController } from './recibos_pago.controller';

describe('RecibosPagoController', () => {
  let controller: RecibosPagoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecibosPagoController],
    }).compile();

    controller = module.get<RecibosPagoController>(RecibosPagoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
