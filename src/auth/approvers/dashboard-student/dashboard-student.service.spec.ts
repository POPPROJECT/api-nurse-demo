import { Test, TestingModule } from '@nestjs/testing';
import { DashboardStudentService } from './dashboard-student.service';

describe('DashboardStudentService', () => {
  let service: DashboardStudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardStudentService],
    }).compile();

    service = module.get<DashboardStudentService>(DashboardStudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
