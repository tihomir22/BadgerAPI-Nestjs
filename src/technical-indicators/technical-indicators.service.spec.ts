import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalIndicatorsService } from './technical-indicators.service';

describe('TechnicalIndicatorsService', () => {
  let service: TechnicalIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TechnicalIndicatorsService],
    }).compile();

    service = module.get<TechnicalIndicatorsService>(TechnicalIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
