import { Test, TestingModule } from '@nestjs/testing';
import { LogRequestsController } from './log-requests.controller';
import { LogRequestsService } from './log-requests.service';

describe('LogRequestsController', () => {
  let controller: LogRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogRequestsController],
      providers: [LogRequestsService],
    }).compile();

    controller = module.get<LogRequestsController>(LogRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
