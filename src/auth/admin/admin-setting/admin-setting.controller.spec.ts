import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingController } from './admin-setting.controller';
import { AdminSettingService } from './admin-setting.service';

describe('AdminSettingController', () => {
  let controller: AdminSettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettingController],
      providers: [AdminSettingService],
    }).compile();

    controller = module.get<AdminSettingController>(AdminSettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
