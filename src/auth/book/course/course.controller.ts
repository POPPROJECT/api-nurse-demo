import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Public() // ← bypass JWT for all routes in here
@Controller('experience-books/:bookId/courses')
export class CourseController {
  constructor(private readonly svc: CourseService) {}

  @Get()
  list(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.svc.list(bookId);
  }

  @Post()
  create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: CreateCourseDto,
  ) {
    return this.svc.create(bookId, dto.name);
  }

  @Patch(':id') // ✅ เพิ่ม endpoint แก้ไขชื่อคอร์ส
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: { name: string }) {
    return this.svc.update(id, dto.name);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
