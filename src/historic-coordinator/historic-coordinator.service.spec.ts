import { Test, TestingModule } from '@nestjs/testing';
import { HistoricCoordinatorService } from './historic-coordinator.service';

describe('HistoricCoordinatorService', () => {
  let service: HistoricCoordinatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoricCoordinatorService],
    }).compile();

    service = module.get<HistoricCoordinatorService>(HistoricCoordinatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
