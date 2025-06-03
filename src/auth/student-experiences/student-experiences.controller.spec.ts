import { Test, TestingModule } from '@nestjs/testing';
import { StudentExperiencesController } from './student-experiences.controller';
import { StudentExperiencesService } from './student-experiences.service';

describe('StudentExperiencesController', () => {
  let controller: StudentExperiencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentExperiencesController],
      providers: [StudentExperiencesService],
    }).compile();

    controller = module.get<StudentExperiencesController>(StudentExperiencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
