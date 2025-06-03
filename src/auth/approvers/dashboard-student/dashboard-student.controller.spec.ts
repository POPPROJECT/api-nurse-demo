import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard-student.controller';
import { DashboardService } from './dashboard-student.service';

describe('DashboardStudentController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [DashboardService],
    }).compile();

    controller = module.get<DashboardController>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
