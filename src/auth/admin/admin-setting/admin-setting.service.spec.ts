import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingService } from './admin-setting.service';

describe('AdminSettingService', () => {
  let service: AdminSettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminSettingService],
    }).compile();

    service = module.get<AdminSettingService>(AdminSettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
