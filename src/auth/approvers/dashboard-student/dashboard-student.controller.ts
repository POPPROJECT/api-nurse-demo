import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardData } from './dashboard-student.service';
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
