import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApproversService {
  constructor(private prisma: PrismaService) {}

  /**
   * ดึง Approver ตาม Role (APPROVER_IN หรือ APPROVER_OUT)
   * โดยแสดงเฉพาะชื่อ, email, และ userId
   */
  async getApproversByRole(role: string) {
    const validRole = role.toUpperCase() as Role; // 🔁 แคสต์เป็น enum โดยตรง
    const approvers = await this.prisma.approverProfile.findMany({
      where: {
        user: {
          role: validRole as Role,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ✅ Map รูปแบบให้ตรงกับที่ frontend ต้องการ
    return approvers.map((a) => ({
      id: a.user.id,
      approverName: a.user.name,
    }));
  }

  // ใหม่: ดึง profile ของตัวเอง (ใช้สำหรับดู pinFailCount/pinLockedUntil)
  async getOwnProfile(userId: number) {
    const prof = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });
    if (!prof) throw new NotFoundException('Profile ไม่ถูกต้อง');
    return prof;
  }
}
