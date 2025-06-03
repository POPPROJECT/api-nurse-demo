import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CheckStudentService } from './check-student.service';
import { GetCheckStudentsQueryDto } from './dto/get-check-students-query.dto';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';

@UseGuards(JwtOrSessionGuard)
@Controller('approver/check-students')
export class CheckStudentController {
  constructor(private readonly svc: CheckStudentService) {}

  /**
   * GET /approver/check-students
   * Query params: bookId, page, limit, search, sortBy, order
   */
  @Get()
  async list(@Query() query: GetCheckStudentsQueryDto) {
    const { bookId, page, limit, search, sortBy: sortByRaw, order } = query;

    const allowed = ['studentId', 'name', 'percent'] as const;
    const sortBy: 'studentId' | 'name' | 'percent' = allowed.includes(sortByRaw)
      ? sortByRaw
      : 'studentId';

    return this.svc.list(bookId, page, limit, search, sortBy, order);
  }
}
