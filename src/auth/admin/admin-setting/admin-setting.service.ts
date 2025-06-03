import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminSettingService {
  constructor(private prisma: PrismaService) {}

  async getExperienceCountingStatus() {
    const setting = await this.prisma.adminSetting.findUnique({
      where: { id: 1 },
    });
    return { enabled: setting?.isExperienceCountingEnabled ?? false };
  }

  async toggleExperienceCounting() {
    const setting = await this.prisma.adminSetting.findUnique({
      where: { id: 1 },
    });

    // ถ้าไม่มี row เลย สร้างใหม่
    if (!setting) {
      const created = await this.prisma.adminSetting.create({
        data: { isExperienceCountingEnabled: true },
      });
      return { enabled: created.isExperienceCountingEnabled };
    }

    const updated = await this.prisma.adminSetting.update({
      where: { id: 1 },
      data: {
        isExperienceCountingEnabled: !setting.isExperienceCountingEnabled,
      },
    });

    return { enabled: updated.isExperienceCountingEnabled };
  }
}
