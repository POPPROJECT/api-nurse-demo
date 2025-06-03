import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminSettingService } from './admin-setting.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('admin/settings')
@UseGuards(JwtOrSessionGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EXPERIENCE_MANAGER)
export class AdminSettingController {
  constructor(private readonly adminSettingService: AdminSettingService) {}

  @Get('get-status')
  @Public() // ✅ ให้ทุกคนเรียกดูสถานะได้
  async getStatus() {
    return this.adminSettingService.getExperienceCountingStatus();
  }

  @Post('toggle-counting')
  async toggle() {
    return this.adminSettingService.toggleExperienceCounting();
  }
}
