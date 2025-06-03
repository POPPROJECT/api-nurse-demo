import { Test, TestingModule } from '@nestjs/testing';
import { AdminLogService } from './admin-log.service';

describe('AdminLogService', () => {
  let service: AdminLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminLogService],
    }).compile();

    service = module.get<AdminLogService>(AdminLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
