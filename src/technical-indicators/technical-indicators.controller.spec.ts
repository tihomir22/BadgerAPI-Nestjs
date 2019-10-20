import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalIndicatorsController } from './technical-indicators.controller';

describe('TechnicalIndicators Controller', () => {
  let controller: TechnicalIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnicalIndicatorsController],
    }).compile();

    controller = module.get<TechnicalIndicatorsController>(TechnicalIndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
