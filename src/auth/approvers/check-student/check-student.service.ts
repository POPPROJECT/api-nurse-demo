import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExperienceStatus } from '@prisma/client';

export type StudentProgress = {
  id: number;
  studentId: string;
  name: string;
  done: number;
  total: number;
  percent: number;
};

@Injectable()
export class CheckStudentService {
  constructor(private prisma: PrismaService) {}

  async list(
    bookId: number,
    page: number,
    limit: number,
    search: string,
    sortBy: 'studentId' | 'name' | 'percent',
    order: 'asc' | 'desc',
    // ▼▼▼ [แก้ไข] รับ progressMode เพิ่ม ▼▼▼
    progressMode: string,
  ): Promise<{ total: number; data: StudentProgress[] }> {
    if (!bookId) throw new BadRequestException('ต้องระบุ bookId');

    // ▼▼▼ [แก้ไข] 1) ตรวจสอบ progressMode และดึง SubCourses ให้ถูกต้อง ▼▼▼
    const subjectId = parseInt(progressMode, 10);
    const isSubjectMode = !isNaN(subjectId);

    const subs = await this.prisma.subCourse.findMany({
      where: {
        course: { bookId },
        // ถ้าเป็นโหมดรายวิชา ให้กรองด้วย subject ที่เป็น string (progressMode)
        ...(isSubjectMode && { subject: progressMode }),
      },
      select: { id: true, name: true, alwaycourse: true, subject: true },
    });
    // ▲▲▲ [สิ้นสุดส่วนที่แก้ไข] ▲▲▲

    // // 1) ดึง subCourses
    // const subs = await this.prisma.subCourse.findMany({
    //   where: { course: { bookId } },
    //   select: { id: true, name: true, alwaycourse: true },
    // });

    if (!subs.length) {
      return {
        total: 0,
        data: [],
      };
    }

    // รวม alwaycourse ทั้งหมดเป็น totalPerStudent
    const totalPerStudent = subs.reduce(
      (sum, s) => sum + (s.alwaycourse ?? 0),
      0,
    );

    // 2) ดึง prefixes
    const prefixes = await this.prisma.bookPrefix.findMany({
      where: { bookId },
      select: { prefix: true },
    });
    const prefixFilters = prefixes.map((p) => ({
      studentId: { startsWith: p.prefix, mode: 'insensitive' },
    }));

    // 3) สร้าง where clause (role + prefix + search)
    const filters: any[] = [
      { user: { role: 'STUDENT' } },
      { OR: prefixFilters },
    ];
    if (search) {
      filters.push({
        OR: [
          { studentId: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    const whereClause = { AND: filters };

    // 4) นับรวมก่อน pagination
    const totalItems = await this.prisma.studentProfile.count({
      where: whereClause,
    });

    // 5) ถ้า sortBy === 'percent' → ดึงครบ ปราศจาก skip/take/orderBy
    let profiles;
    if (sortBy === 'percent') {
      profiles = await this.prisma.studentProfile.findMany({
        where: whereClause,
        include: { user: { select: { name: true } } },
      });
    } else {
      // build orderBy สำหรับ studentId หรือ name
      const orderByArg =
        sortBy === 'studentId'
          ? { studentId: order }
          : { user: { name: order } }; // ← เปลี่ยนตรงนี้ให้ใช้ relation.user.name

      profiles = await this.prisma.studentProfile.findMany({
        where: whereClause,
        include: { user: { select: { name: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: orderByArg,
      });
    }

    // 6) คำนวณ done/total/percent สำหรับแต่ละ profile
    const list: StudentProgress[] = await Promise.all(
      profiles.map(async (prof) => {
        const exps = await this.prisma.studentExperience.findMany({
          where: {
            bookId,
            studentId: prof.id,
            status: ExperienceStatus.CONFIRMED,
            isDeleted: false,
          },
          select: { subCourse: true },
        });

        // map subCourse.name → count
        const m = new Map<string, number>();
        exps.forEach((e) => {
          if (!e.subCourse) return;
          m.set(e.subCourse, (m.get(e.subCourse) ?? 0) + 1);
        });

        // sum(min(count, requiredCount))
        let doneCount = 0;
        for (const sub of subs) {
          const c = m.get(sub.name) ?? 0;
          doneCount += Math.min(c, sub.alwaycourse ?? 0);
        }
        const capped = Math.min(doneCount, totalPerStudent);

        return {
          id: prof.userId,
          studentId: prof.studentId ?? '(ยังไม่ระบุ)',
          name: prof.user.name,
          done: capped,
          total: totalPerStudent,
          percent: totalPerStudent
            ? Math.round((capped / totalPerStudent) * 100)
            : 0,
        };
      }),
    );

    // 7) ถ้า sortBy === 'percent' → sort+paginate ฝั่ง JS
    let data = list;
    if (sortBy === 'percent') {
      data = list
        .sort((a, b) =>
          order === 'asc' ? a.percent - b.percent : b.percent - a.percent,
        )
        .slice((page - 1) * limit, page * limit);
    }

    return { total: totalItems, data };
  }
}
