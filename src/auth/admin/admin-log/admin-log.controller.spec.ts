import { Test, TestingModule } from '@nestjs/testing';
import { AdminLogController } from './admin-log.controller';
import { AdminLogService } from './admin-log.service';

describe('AdminLogController', () => {
  let controller: AdminLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLogController],
      providers: [AdminLogService],
    }).compile();

    controller = module.get<AdminLogController>(AdminLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
