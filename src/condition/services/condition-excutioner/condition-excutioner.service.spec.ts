import { Test, TestingModule } from '@nestjs/testing';
import { ConditionExcutionerService } from './condition-excutioner.service';

describe('ConditionExcutionerService', () => {
  let service: ConditionExcutionerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionExcutionerService],
    }).compile();

    service = module.get<ConditionExcutionerService>(ConditionExcutionerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
