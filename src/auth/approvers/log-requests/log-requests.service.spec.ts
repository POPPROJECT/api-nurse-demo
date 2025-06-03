import { Test, TestingModule } from '@nestjs/testing';
import { LogRequestsService } from './log-requests.service';

describe('LogRequestsService', () => {
  let service: LogRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogRequestsService],
    }).compile();

    service = module.get<LogRequestsService>(LogRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
