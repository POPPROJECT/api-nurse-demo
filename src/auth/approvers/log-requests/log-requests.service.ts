// back/src/approver/log-requests/log-requests.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetLogRequestsQueryDto } from './dto/get-log-requests-query.dto';
import { ExperienceStatus } from '@prisma/client';

@Injectable()
export class LogRequestsService {
  constructor(private prisma: PrismaService) {}

  async getLogs(userId: number, q: GetLogRequestsQueryDto) {
    const { page, limit, search, sortBy, order, status, startDate, endDate } =
      q;
    const skip = (page - 1) * limit;

    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!approver) throw new BadRequestException('ไม่พบข้อมูลผู้ตรวจ');

    const where: any = {
      approverRole: approver.user.role,
      approverName: approver.user.name,
      status:
        status === 'all'
          ? { in: [ExperienceStatus.CONFIRMED, ExperienceStatus.CANCEL] }
          : status === 'confirmed'
            ? ExperienceStatus.CONFIRMED
            : ExperienceStatus.CANCEL,
    };

    if (search) {
      where.OR = [
        { student: { studentId: { contains: search, mode: 'insensitive' } } },
        {
          student: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        { course: { name: { contains: search, mode: 'insensitive' } } }, // แก้ไขให้ค้นหาใน name
        { subCourse: { name: { contains: search, mode: 'insensitive' } } }, // แก้ไขให้ค้นหาใน name
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,
        include: {
          student: {
            select: { studentId: true, user: { select: { name: true } } },
          },
          course: {
            select: { name: true },
          },
          subCourse: {
            select: { name: true },
          },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    return { total, data };
  }
}
