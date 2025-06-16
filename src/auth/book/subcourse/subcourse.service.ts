import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubCourseDto } from './dto/create-subcourse.dto';
import { UpdateSubCourseDto } from './dto/update-subcourse.dto';

@Injectable()
export class SubCourseService {
  constructor(private prisma: PrismaService) {}

  /** คืน list ของ subcourse ใน courseId พร้อม requiredCount */
  list(courseId: number) {
    return this.prisma.subCourse.findMany({
      where: { courseId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        subject: true,
        alwaycourse: true,
        inSubjectCount: true,
        isSubjectFreeform: true,
      },
    });
  }

  /** สร้าง subcourse ใหม่ ผูกกับ courseId */
  async create(courseId: number, dto: CreateSubCourseDto) {
    // ตรวจสอบ course มีจริง (optional)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    return this.prisma.subCourse.create({
      data: {
        courseId,
        name: dto.name,
        subject: dto.subject,
        alwaycourse: dto.alwaycourse,
        inSubjectCount: dto.inSubjectCount,
        isSubjectFreeform: dto.isSubjectFreeform,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        alwaycourse: true,
        inSubjectCount: true,
        isSubjectFreeform: true,
      },
    });
  }

  /** อัปเดตชื่อ หรือจำนวนครั้งของ subcourse ตาม id */
  async update(id: number, dto: UpdateSubCourseDto) {
    const existing = await this.prisma.subCourse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`SubCourse ${id} not found`);

    return this.prisma.subCourse.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        subject: dto.subject ?? existing.subject,
        alwaycourse: dto.alwaycourse ?? existing.alwaycourse,
        inSubjectCount: dto.inSubjectCount ?? existing.inSubjectCount,
        isSubjectFreeform: dto.isSubjectFreeform ?? existing.isSubjectFreeform,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        alwaycourse: true,
        inSubjectCount: true,
        isSubjectFreeform: true,
      },
    });
  }

  /** ลบ subcourse ตาม id */
  async delete(id: number) {
    const existing = await this.prisma.subCourse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`SubCourse ${id} not found`);

    return this.prisma.subCourse.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }
}
