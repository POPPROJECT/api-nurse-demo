// request.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExperienceStatus, Prisma } from '@prisma/client'; // [แก้ไข] import Prisma
import { PendingRequestsQueryDto } from '../dto/pending-requests-query.dto';
import { PinDto } from '../dto/pin.dto';
import { BulkPinDto } from '../dto/bulk-pin.dto';

const MAX_PIN_FAIL = 5;
const COOLDOWN_MS = 60 * 60 * 1000;

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async findPendingForApprover(userName: string, q: PendingRequestsQueryDto) {
    const { page, limit, search, sortBy = 'createdAt', order = 'desc' } = q;
    const skip = (page - 1) * limit;

    // [แก้ไข] แก้ไข Where Clause ให้ถูกต้อง
    const where: Prisma.StudentExperienceWhereInput = {
      status: ExperienceStatus.PENDING,
      approverName: userName,
    };
    if (search) {
      where.OR = [
        { course: { name: { contains: search, mode: 'insensitive' } } }, // <-- แก้ไข
        { subCourse: { name: { contains: search, mode: 'insensitive' } } }, // <-- แก้ไข
        {
          student: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        { student: { studentId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // [แก้ไข] สร้าง object สำหรับ orderBy ให้รองรับทุกเงื่อนไข
    let orderBy: Prisma.StudentExperienceOrderByWithRelationInput = {
      [sortBy]: order,
    };
    if (sortBy === 'studentName') {
      orderBy = { student: { user: { name: order } } };
    } else if (sortBy === 'course') {
      orderBy = { course: { name: order } };
    } else if (sortBy === 'subCourse') {
      orderBy = { subCourse: { name: order } };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,
        // [แก้ไข] เพิ่ม include ให้ครบเพื่อให้ Frontend แสดงผลได้
        include: {
          student: {
            select: {
              studentId: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          course: {
            select: { id: true, name: true },
          },
          subCourse: {
            select: { id: true, name: true },
          },
          fieldValues: {
            include: {
              field: {
                select: {
                  label: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return { total, data };
  }

  private async validatePin(userId: number, dto: PinDto | BulkPinDto) {
    // แก้ไข type hinting เล็กน้อย
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });
    if (!approver) throw new BadRequestException('ไม่มีสิทธิ์ใช้งาน');

    const now = new Date();
    if (approver.pinLockedUntil && approver.pinLockedUntil > now) {
      const mins = Math.ceil(
        (approver.pinLockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new BadRequestException(
        `กรุณารออีก ${mins} นาที ก่อนกรอก PIN ใหม่`,
      );
    }

    if (dto.pin !== approver.pin) {
      const fails = approver.pinFailCount + 1;
      const updateData: any = { pinFailCount: fails };
      if (fails >= MAX_PIN_FAIL) {
        updateData.pinFailCount = 0;
        updateData.pinLockedUntil = new Date(now.getTime() + COOLDOWN_MS);
      }
      await this.prisma.approverProfile.update({
        where: { userId },
        data: updateData,
      });
      const msg =
        fails < MAX_PIN_FAIL
          ? `PIN ไม่ถูกต้อง คุณกรอกผิดไป ${fails} จาก ${MAX_PIN_FAIL} ครั้ง`
          : `ลอง PIN ผิดเกิน ${MAX_PIN_FAIL} ครั้ง ระบบล็อก 1 ชั่วโมง`;
      throw new BadRequestException(msg);
    }

    // Reset counter ถ้า PIN ถูกต้อง
    if (approver.pinFailCount > 0) {
      await this.prisma.approverProfile.update({
        where: { userId },
        data: {
          pinFailCount: 0,
          pinLockedUntil: null,
        },
      });
    }
  }

  async confirmOne(id: string, userId: number, dto: PinDto) {
    await this.validatePin(userId, dto);
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
    });
    if (!exp || exp.status !== ExperienceStatus.PENDING) {
      throw new NotFoundException('ไม่พบคำขอหรือสถานะไม่ใช่ PENDING');
    }
    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  async rejectOne(id: string, userId: number, dto: PinDto) {
    await this.validatePin(userId, dto);
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
    });
    if (!exp || exp.status !== ExperienceStatus.PENDING) {
      throw new NotFoundException('ไม่พบคำขอหรือสถานะไม่ใช่ PENDING');
    }
    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CANCEL },
    });
  }

  async confirmBulk(userId: number, dto: BulkPinDto) {
    await this.validatePin(userId, dto);
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });
    if (!approver) throw new BadRequestException('ไม่พบผู้ตรวจ');
    return this.prisma.studentExperience.updateMany({
      where: {
        id: { in: dto.ids.map(String) },
        status: ExperienceStatus.PENDING,
        approverName: approver.user.name,
      },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  async rejectBulk(userId: number, dto: BulkPinDto) {
    await this.validatePin(userId, dto);
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });
    if (!approver) throw new BadRequestException('ไม่พบผู้ตรวจ');
    return this.prisma.studentExperience.updateMany({
      where: {
        id: { in: dto.ids.map(String) },
        status: ExperienceStatus.PENDING,
        approverName: approver.user.name,
      },
      data: { status: ExperienceStatus.CANCEL },
    });
  }
}
