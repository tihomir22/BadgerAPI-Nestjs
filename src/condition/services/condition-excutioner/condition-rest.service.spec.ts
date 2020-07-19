import { Test, TestingModule } from '@nestjs/testing';
import { ConditionRestService } from './condition-rest.service';

describe('ConditionRestService', () => {
  let service: ConditionRestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionRestService],
    }).compile();

    service = module.get<ConditionRestService>(ConditionRestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
