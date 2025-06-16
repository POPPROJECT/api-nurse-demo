import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardData, DashboardService } from './dashboard-student.service';
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
  async getDashboard(
    @Query('bookId', ParseIntPipe) bookId: number,
    @Query('filterMode') filterMode: 'OVERALL' | 'BY_SUBJECT',
  ): Promise<DashboardData> {
    if (filterMode === 'BY_SUBJECT') {
      return this.dashboardService.getDashboardBySubject(bookId);
    }
    // Default to OVERALL
    return this.dashboardService.getDashboardOverall(bookId);
  }

  @Get('students')
  async getStudentsForCategory(
    @Query('bookId', ParseIntPipe) bookId: number,
    @Query('categoryId', ParseIntPipe) categoryId: number,
    @Query('type') type: 'course' | 'subcategory',
    @Query('viewMode') viewMode: 'OVERALL' | 'BY_SUBJECT',
  ) {
    return this.dashboardService.getStudentsForCategory(
      bookId,
      categoryId,
      type,
      viewMode,
    );
  }
}
