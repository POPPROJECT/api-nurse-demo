import { Module } from '@nestjs/common';
import { SubCourseController } from './subcourse.controller'; // ← ชื่อให้ตรงกับ export
import { SubCourseService } from './subcourse.service'; // ← ชื่อให้ตรงกับ export
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // ← เพิ่ม PrismaModule
  controllers: [SubCourseController],
  providers: [SubCourseService],
  exports: [SubCourseService],
})
export class SubCourseModule {} // ← ตั้งชื่อให้ตรงกับไฟล์/คลาส
