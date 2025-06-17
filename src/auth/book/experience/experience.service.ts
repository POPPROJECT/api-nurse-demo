//backend\src\auth\book\experience\experience.service.ts
import { Body, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SyncFieldDto } from './dto/sync-fields.dto';
import { CopyBookDto } from './dto/copy-book.dto';
import { Prisma } from '@prisma/client'; // ← import ใหม่

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

    const subCourses = await this.prisma.subCourse.findMany({
      where: { id: { in: progress.map((p) => p.subCourseId) } },
      include: { course: true },
    });
    const subCoursesMap = new Map(subCourses.map((sc) => [sc.id, sc]));

    const existingLogs = await this.prisma.studentExperience.groupBy({
      by: ['subCourseId'],
      where: {
        bookId,
        studentId,
        status: 'CONFIRMED',
        isDeleted: false,
        // [แก้ไข] ลบบรรทัดนี้ออก เพราะ subCourseId เป็น field บังคับ ไม่มีทางเป็น null
        // subCourseId: { not: null },
      },
      _count: {
        subCourseId: true,
      },
    });

    const existingMap: Record<number, number> = {};
    for (const log of existingLogs) {
      // Logic ส่วนนี้จะกลับมาทำงานได้ถูกต้องเมื่อแก้ where clause แล้ว
      if (log.subCourseId && log._count) {
        existingMap[log.subCourseId] = log._count.subCourseId;
      }
    }

    const allNewLogsData: Prisma.StudentExperienceCreateManyInput[] = [];
    for (const { subCourseId, count } of progress) {
      const sub = subCoursesMap.get(subCourseId);
      if (!sub || count <= 0) continue;

      const existing = existingMap[subCourseId] || 0;
      const remaining = Math.max(0, count - existing);
      if (remaining <= 0) continue;

      for (let i = 0; i < remaining; i++) {
        allNewLogsData.push({
          studentId,
          bookId,
          courseId: sub.courseId,
          subCourseId: sub.id,
          approverRole: 'EXPERIENCE_MANAGER',
          approverName: 'ผู้จัดการเล่มบันทึก',
          status: 'CONFIRMED',
        });
      }
    }

    if (allNewLogsData.length > 0) {
      await this.prisma.studentExperience.createMany({
        data: allNewLogsData,
      });
    }

    return { message: 'เพิ่ม progress ใหม่แล้ว' };
  }

  async getStudentProgress(bookId: number, studentId: number) {
    const logs = await this.prisma.studentExperience.groupBy({
      by: ['subCourseId'],
      where: {
        bookId,
        studentId,
        status: 'CONFIRMED',
        isDeleted: false,
        // [แก้ไข] ลบบรรทัดนี้ออก เพราะ subCourseId เป็น field บังคับ ไม่มีทางเป็น null
        // subCourseId: { not: null },
      },
      _count: {
        subCourseId: true,
      },
    });

    const subCourseIds = logs
      .map((l) => l.subCourseId)
      .filter((id): id is number => id !== null);
    const subCourses = await this.prisma.subCourse.findMany({
      where: { id: { in: subCourseIds } },
      select: { id: true, name: true },
    });
    const subCourseMap = new Map(subCourses.map((sc) => [sc.id, sc.name]));

    const result: Record<string, number> = {};
    for (const log of logs) {
      // Logic ส่วนนี้จะกลับมาทำงานได้ถูกต้องเมื่อแก้ where clause แล้ว
      if (log.subCourseId && log._count) {
        const subCourseName = subCourseMap.get(log.subCourseId);
        if (subCourseName) {
          result[subCourseName] = log._count.subCourseId;
        }
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

  //dashboard-subject
  async findCoursesByBookId(bookId: number) {
    return this.prisma.course.findMany({
      where: { bookId },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // ▼▼▼ [แก้ไข] เปลี่ยน Return Type ของฟังก์ชันจาก number[] เป็น string[] ▼▼▼
  async findSubjectsByBookId(bookId: number): Promise<string[]> {
    const subjects = await this.prisma.subCourse.findMany({
      where: {
        course: {
          bookId: bookId,
        },
        subject: { not: null },
      },
      distinct: ['subject'],
      select: {
        subject: true,
      },
      orderBy: {
        subject: 'asc',
      },
    });

    return subjects.map((s) => s.subject!);
  }
}
