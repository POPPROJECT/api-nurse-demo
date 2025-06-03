import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApproversService } from './approvers.service';
import { JwtOrSessionGuard } from '../guards/jwt-or-session.guard';

const MAX_PIN_FAIL = 5; // ถ้ากรอก PIN ผิดติดกันได้ไม่เกินกี่ครั้ง

@Controller('approvers')
export class ApproversController {
  constructor(private readonly approversService: ApproversService) {}

  /**
   * 🔐 GET /approvers/by-role/:role
   * ใช้สำหรับดึงรายชื่อ Approver ตาม Role เช่น APPROVER_IN หรือ APPROVER_OUT
   */
  // @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
  @Get('by-role/:role')
  async getApproversByRole(@Param('role') role: string, @Req() req) {
    return this.approversService.getApproversByRole(role);
  }

  @UseGuards(JwtOrSessionGuard)
  @Get('me/pin-status')
  async pinStatus(@Req() req) {
    const prof = await this.approversService.getOwnProfile(req.user.id);
    return {
      pinFailCount: prof.pinFailCount,
      pinLockedUntil: prof.pinLockedUntil,
      maxFails: MAX_PIN_FAIL, // คุณอาจ export ค่าคงที่นี้ไว้
    };
  }
}
