import { Test, TestingModule } from '@nestjs/testing';
import { ExperienceBookController } from './experience.controller';
import { ExperienceBookService } from './experience.service';

describe('ExperienceController', () => {
  let controller: ExperienceBookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperienceBookController],
      providers: [ExperienceBookService],
    }).compile();

    controller = module.get<ExperienceBookController>(ExperienceBookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
