import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { PendingRequestsQueryDto } from '../dto/pending-requests-query.dto';
import { BulkPinDto } from '../dto/bulk-pin.dto';
import { PinDto } from '../dto/pin.dto';

@UseGuards(JwtOrSessionGuard)
@Controller('approver/requests')
export class RequestsController {
  private readonly logger = new Logger(RequestsController.name);

  constructor(private readonly svc: RequestsService) {}

  /** GET /approver/requests?search=&sortBy=&order=&page=&limit= */
  @Get()
  list(@Req() req, @Query() q: PendingRequestsQueryDto) {
    this.logger.debug(`→ GET /approver/requests?${JSON.stringify(q)}`);
    return this.svc.findPendingForApprover(req.user.name, q);
  }

  /** PATCH /approver/requests/:id/confirm */
  @Patch(':id/confirm')
  confirmOne(@Req() req, @Param('id') id: string, @Body() dto: PinDto) {
    this.logger.debug(
      `→ PATCH /approver/requests/${id}/confirm payload=${JSON.stringify(dto)}`,
    );
    return this.svc.confirmOne(id, req.user.id, dto);
  }

  /** PATCH /approver/requests/:id/reject */
  @Patch(':id/reject')
  rejectOne(@Req() req, @Param('id') id: string, @Body() dto: PinDto) {
    this.logger.debug(
      `→ PATCH /approver/requests/${id}/reject payload=${JSON.stringify(dto)}`,
    );
    return this.svc.rejectOne(id, req.user.id, dto);
  }

  /** PATCH /approver/requests/bulk-confirm */
  @Patch('bulk-confirm')
  confirmBulk(@Req() req, @Body() dto: BulkPinDto) {
    this.logger.debug(
      `→ PATCH /approver/requests/bulk-confirm payload=${JSON.stringify(dto)}`,
    );
    return this.svc.confirmBulk(req.user.id, dto);
  }

  /** PATCH /approver/requests/bulk-reject */
  @Patch('bulk-reject')
  rejectBulk(@Req() req, @Body() dto: BulkPinDto) {
    this.logger.debug(
      `→ PATCH /approver/requests/bulk-reject payload=${JSON.stringify(dto)}`,
    );
    return this.svc.rejectBulk(req.user.id, dto);
  }
}
