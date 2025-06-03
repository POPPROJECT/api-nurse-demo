//backend\src\auth\book\experience\experience.service.ts
import { Body, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SyncFieldDto } from './dto/sync-fields.dto';
import { CopyBookDto } from './dto/copy-book.dto'; // ← import ใหม่

@Injectable()
export class ExperienceBookService {
  constructor(private prisma: PrismaService) {}

  // ─── Book ────────────────────────────────────
  createBook(@Body() dto: CreateBookDto) {
    return this.prisma.experienceBook.create({ data: dto });
  }

  listBooks() {
    return this.prisma.experienceBook.findMany({
      include: {
        courses: {
          include: {
            subCourses: true,
          },
        },
      },
    });
  }

  async getBook(id: number) {
    try {
      const book = await this.prisma.experienceBook.findUnique({
        where: { id },
        include: {
          fields: true,
          courses: {
            include: {
              subCourses: true,
            },
          },
        },
      });

      if (!book) throw new NotFoundException('Book not found');
      return book;
    } catch (error) {
      console.error('❌ getBook error:', error);
      throw error;
    }
  }

  updateBook(id: number, dto: UpdateBookDto) {
    return this.prisma.experienceBook.update({ where: { id }, data: dto });
  }

  deleteBook(id: number) {
    return this.prisma.experienceBook.delete({ where: { id } });
  }

  // ─── Field ────────────────────────────────────

  /** ดูรายการฟิลด์ */
  listFields(bookId: number) {
    return this.prisma.fieldConfig.findMany({
      where: { bookId },
      orderBy: { order: 'asc' },
    });
  }

  /** ลบฟิลด์เดิมทั้งหมด แล้วสร้างชุดใหม่จาก fields */
  async bulkReplaceFields(bookId: number, fields: CreateFieldDto[]) {
    // ลบชุดเดิม
    await this.prisma.fieldConfig.deleteMany({ where: { bookId } });

    // เตรียม data ใหม่
    const data = fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      order: f.order,
      options: f.options || [],
      bookId,
    }));

    // สร้างชุดใหม่ทั้งหมด
    await this.prisma.fieldConfig.createMany({ data });

    // คืนค่า list ใหม่
    return this.prisma.fieldConfig.findMany({
      where: { bookId },
      orderBy: { order: 'asc' },
    });
  }

  // (Optional) ยังคงให้ updateField / deleteField แยกทีละตัวได้
  updateField(id: number, dto: UpdateFieldDto) {
    return this.prisma.fieldConfig.update({ where: { id }, data: dto });
  }

  deleteField(id: number) {
    return this.prisma.fieldConfig.delete({ where: { id } });
  }

  async syncFields(bookId: number, fields: SyncFieldDto[]) {
    // 1) รวบรวม id ที่มีใน DB อยู่แล้ว
    const existing = await this.prisma.fieldConfig.findMany({
      where: { bookId },
      select: { id: true },
    });
    const existingIds = existing.map((e) => e.id);

    // 2) รวบรวม id ที่มากับ payload (เฉพาะ those with id)
    const incomingIds = fields
      .map((f) => f.id)
      .filter((id): id is number => typeof id === 'number');

    // 3) คำนวณชุดที่จะลบ (อยู่ใน DB แต่ไม่อยู่ใน payload)
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await this.prisma.fieldConfig.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // 4) Upsert ทั้งชุดที่เหลือ
    await Promise.all(
      fields.map((f) =>
        this.prisma.fieldConfig.upsert({
          where: { id: f.id ?? 0 },
          create: {
            bookId,
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            order: f.order,
            options: f.options ?? [],
          },
          update: {
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            order: f.order,
            options: f.options ?? [],
          },
        }),
      ),
    );

    // 5) ส่งกลับรายการฟิลด์แบบเรียงลำดับให้ client ดึงอัปเดตหน้าใหม่
    return this.prisma.fieldConfig.findMany({
      where: { bookId },
      orderBy: { order: 'asc' },
    });
  }

  /** ✅ ดึงข้อมูลรวม Book + Course + SubCourse พร้อม requiredCount */
  async getBooksWithCounts() {
    return this.prisma.experienceBook.findMany({
      include: {
        courses: {
          include: {
            subCourses: true,
          },
        },
      },
    });
  }

  /** ✅ อัปเดต requiredCount ของ SubCourse */
  async updateRequiredCounts(data: any) {
    const updates: any[] = [];

    for (const book of data) {
      for (const course of book.courses) {
        for (const sub of course.subCourses || []) {
          updates.push(
            this.prisma.subCourse.update({
              where: { id: sub.id },
              data: { alwaycourse: sub.alwaycourse },
            }),
          );
        }
      }
    }

    await Promise.all(updates);
    return { message: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async setStudentProgress(
    bookId: number,
    studentId: number,
    progress: { subCourseId: number; count: number }[],
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student ID ${studentId} ไม่พบในระบบ`);
    }

    // 1. ดึงข้อมูล subCourse -> course
    const subCourses = await this.prisma.subCourse.findMany({
      where: { id: { in: progress.map((p) => p.subCourseId) } },
      include: { course: true },
    });

    // 2. ดึงจำนวน log เดิมของแต่ละ subCourse
    const existingLogs = await this.prisma.studentExperience.groupBy({
      by: ['subCourse'],
      where: {
        bookId,
        studentId,
        status: 'CONFIRMED',
        isDeleted: false,
      },
      _count: true,
    });

    const existingMap: Record<string, number> = {};
    for (const log of existingLogs) {
      if (log.subCourse) {
        existingMap[log.subCourse] = log._count;
      }
    }

    // 3. สร้าง log ใหม่เฉพาะจำนวนที่ยังไม่ถึง
    const allNewLogs = progress.flatMap(({ subCourseId, count }) => {
      const sub = subCourses.find((s) => s.id === subCourseId);
      if (!sub || count <= 0) return [];

      const existing = existingMap[sub.name] || 0;
      const remaining = Math.max(0, count - existing);
      if (remaining <= 0) return [];

      return Array(remaining).fill({
        studentId,
        bookId,
        course: sub.course.name,
        subCourse: sub.name,
        approverRole: 'EXPERIENCE_MANAGER', // mock
        approverName: 'ผู้จัดการเล่มบันทึก',
        status: 'CONFIRMED',
      });
    });

    if (allNewLogs.length > 0) {
      await this.prisma.studentExperience.createMany({
        data: allNewLogs,
      });
    }

    return { message: 'เพิ่ม progress ใหม่แล้ว' };
  }

  async getStudentProgress(bookId: number, studentId: number) {
    // ✅ ดึงจำนวน log ที่ CONFIRMED แยกตาม subCourse
    const logs = await this.prisma.studentExperience.groupBy({
      by: ['subCourse'],
      where: {
        bookId,
        studentId,
        status: 'CONFIRMED',
        isDeleted: false,
        subCourse: { not: null },
      },
      _count: true,
    });

    // ✅ แปลงเป็น map { subCourseName: count }
    const result: Record<string, number> = {};
    for (const log of logs) {
      if (log.subCourse) {
        result[log.subCourse] = log._count;
      }
    }

    return result;
  }

  //คัดลอกสมุด
  async copyBook(bookId: number, dto: CopyBookDto) {
    // 1) หา original book พร้อมความสัมพันธ์ทั้งหมด
    const orig = await this.prisma.experienceBook.findUnique({
      where: { id: bookId },
      include: {
        fields: true,
        prefixes: true,
        courses: { include: { subCourses: true } },
      },
    });
    if (!orig) throw new NotFoundException(`Book ${bookId} not found`);

    // 2) ใช้ transaction คัดลอกข้อมูลทั้งหมด
    return this.prisma.$transaction(async (tx) => {
      // สร้าง book ใหม่
      const copy = await tx.experienceBook.create({
        data: {
          title: dto.title,
          description: orig.description,
        },
      });

      // copy fields
      await Promise.all(
        orig.fields.map((f) =>
          tx.fieldConfig.create({
            data: {
              bookId: copy.id,
              name: f.name,
              label: f.label,
              type: f.type,
              required: f.required,
              order: f.order,
              options: f.options,
            },
          }),
        ),
      );

      // copy prefixes
      await Promise.all(
        orig.prefixes.map((p) =>
          tx.bookPrefix.create({
            data: {
              bookId: copy.id,
              prefix: p.prefix,
            },
          }),
        ),
      );

      // copy courses + subCourses
      for (const course of orig.courses) {
        const newCourse = await tx.course.create({
          data: {
            bookId: copy.id,
            name: course.name,
          },
        });
        await Promise.all(
          course.subCourses.map((sc) =>
            tx.subCourse.create({
              data: {
                courseId: newCourse.id,
                name: sc.name,
                subject: sc.subject,
                alwaycourse: sc.alwaycourse,
              },
            }),
          ),
        );
      }

      return copy;
    });
  }
}
