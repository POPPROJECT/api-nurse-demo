import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceBookService } from './experience.service';

describe('ExperienceService', () => {
  let service: ExperienceBookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExperienceBookService],
    }).compile();

    service = module.get<ExperienceBookService>(ExperienceBookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
