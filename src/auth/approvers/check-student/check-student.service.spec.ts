import { Test, TestingModule } from '@nestjs/testing';
import { CheckStudentService } from './check-student.service';

describe('CheckStudentService', () => {
  let service: CheckStudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckStudentService],
    }).compile();

    service = module.get<CheckStudentService>(CheckStudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
