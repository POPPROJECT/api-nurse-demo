import { Test, TestingModule } from '@nestjs/testing';
import { SubCourseController } from './subcourse.controller'; // ← ชื่อให้ตรงกับ export
import { SubCourseService } from './subcourse.service'; // ← ชื่อให้ตรงกับ export
describe('SubcourseController', () => {
  let controller: SubCourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubCourseController],
      providers: [SubCourseService],
    }).compile();

    controller = module.get<SubCourseController>(SubCourseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
