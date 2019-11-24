import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeCoordinatorService } from './exchange-coordinator';

describe('ExchangeCoordinatorService', () => {
  let service: ExchangeCoordinatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeCoordinatorService],
    }).compile();

    service = module.get<ExchangeCoordinatorService>(ExchangeCoordinatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
