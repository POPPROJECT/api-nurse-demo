import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SubCourseService } from './subcourse.service';
import { UpdateSubCourseDto } from './dto/update-subcourse.dto';
import { CreateSubCourseDto } from './dto/create-subcourse.dto';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';

// @UseGuards(JwtAuthGuard) // ต้องล็อกอินก่อนใช้งาน
@UseGuards(JwtOrSessionGuard)
@Controller('courses/:courseId/subcourses')
export class SubCourseController {
  constructor(private readonly svc: SubCourseService) {}

  /** GET /courses/:courseId/subcourses */
  @Get()
  list(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.svc.list(courseId);
  }

  /** POST /courses/:courseId/subcourses */
  @Post()
  create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateSubCourseDto,
  ) {
    return this.svc.create(courseId, dto);
  }

  /** PATCH /courses/:courseId/subcourses/:id */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubCourseDto,
  ) {
    return this.svc.update(id, dto);
  }

  /** DELETE /courses/:courseId/subcourses/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.delete(id);
  }
}
