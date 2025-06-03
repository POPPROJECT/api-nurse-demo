import { Test, TestingModule } from '@nestjs/testing';
import { SubCourseService } from './subcourse.service';

describe('SubcourseService', () => {
  let service: SubCourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubCourseService],
    }).compile();

    service = module.get<SubCourseService>(SubCourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
