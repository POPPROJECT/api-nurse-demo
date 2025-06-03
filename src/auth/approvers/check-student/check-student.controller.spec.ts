import { Test, TestingModule } from '@nestjs/testing';
import { CheckStudentController } from './check-student.controller';
import { CheckStudentService } from './check-student.service';

describe('CheckStudentController', () => {
  let controller: CheckStudentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckStudentController],
      providers: [CheckStudentService],
    }).compile();

    controller = module.get<CheckStudentController>(CheckStudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
