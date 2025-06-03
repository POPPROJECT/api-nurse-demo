import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { LogRequestsService } from './log-requests.service';
import { GetLogRequestsQueryDto } from './dto/get-log-requests-query.dto';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@UseGuards(JwtOrSessionGuard)
@Controller('approver/log-requests')
export class LogRequestsController {
  constructor(private svc: LogRequestsService) {}

  /** GET /approver/log-requests */
  @Get()
  getLogs(
    @CurrentUser() user: { id: number },
    @Query() q: GetLogRequestsQueryDto,
  ) {
    return this.svc.getLogs(user.id, q);
  }
}
