import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';

@Module({
  imports: [PrismaModule], // ← ต้องมี
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
