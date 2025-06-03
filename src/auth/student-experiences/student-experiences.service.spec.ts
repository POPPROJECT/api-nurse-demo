import { Test, TestingModule } from '@nestjs/testing';
import { StudentExperiencesService } from './student-experiences.service';

describe('StudentExperiencesService', () => {
  let service: StudentExperiencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentExperiencesService],
    }).compile();

    service = module.get<StudentExperiencesService>(StudentExperiencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
