import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeCoordinatorController } from './exchange-coordinator.controller';

describe('ExchangeCoordinator Controller', () => {
  let controller: ExchangeCoordinatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeCoordinatorController],
    }).compile();

    controller = module.get<ExchangeCoordinatorController>(ExchangeCoordinatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
