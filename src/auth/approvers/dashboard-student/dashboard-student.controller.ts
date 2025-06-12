import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  DashboardData,
  DashboardService,
  DashboardSubjectService,
} from './dashboard-student.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('approver/dashboard')
@UseGuards(JwtOrSessionGuard, RolesGuard)
@Roles(Role.APPROVER_IN, Role.ADMIN, Role.EXPERIENCE_MANAGER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Query('bookId') bookId: string): Promise<DashboardData> {
    return this.dashboardService.getDashboard(Number(bookId));
  }
}

@Controller('approver/dashboard-subject') // <-- Endpoint ใหม่
@UseGuards(JwtOrSessionGuard, RolesGuard)
@Roles(Role.APPROVER_IN, Role.ADMIN, Role.EXPERIENCE_MANAGER)
export class DashboardSubjectController {
  constructor(private readonly dashboardService: DashboardSubjectService) {}

  @Get()
  async getDashboard(
    @Query('bookId') bookId: string,
    @Query('courseId') courseId: string, // <-- รับ courseId เพิ่ม
  ): Promise<DashboardData> {
    return this.dashboardService.getDashboardBySubject(
      Number(bookId),
      Number(courseId),
    );
  }
}
