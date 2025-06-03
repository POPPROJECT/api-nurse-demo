import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminLogService } from './admin-log.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

@Controller('admin/logs')
@UseGuards(JwtOrSessionGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLogController {
  constructor(private readonly adminLogService: AdminLogService) {}

  @Get()
  async getLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('action') action?: 'create' | 'update' | 'delete',
    @Query('entity') entity?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminLogService.getLogs({
      page: +page,
      limit: +limit,
      search,
      action,
      entity,
      sortBy,
      order,
      startDate,
      endDate,
    });
  }
}
