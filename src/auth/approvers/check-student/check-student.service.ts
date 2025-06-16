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
    progressMode: string,
  ): Promise<{ total: number; data: StudentProgress[] }> {
    if (!bookId) throw new BadRequestException('ต้องระบุ bookId');

    // 1. ดึง SubCourse ทั้งหมดของสมุดเล่มนี้ โดยไม่กรองอะไรเพิ่มเติม
    const subs = await this.prisma.subCourse.findMany({
      where: {
        course: { bookId },
      },
      select: { id: true, name: true, alwaycourse: true, inSubjectCount: true },
    });

    if (!subs.length) {
      return {
        total: 0,
        data: [],
      };
    }

    // 2. คำนวณ "ยอดรวมที่ต้องทำ" (totalPerStudent) ตาม progressMode
    // ถ้าโหมดคือ 'inSubject' ให้รวมจาก 'inSubjectCount', นอกนั้นให้รวมจาก 'alwaycourse'
    const totalPerStudent =
      progressMode === 'inSubject'
        ? subs.reduce((sum, s) => sum + (s.inSubjectCount ?? 0), 0)
        : subs.reduce((sum, s) => sum + (s.alwaycourse ?? 0), 0);

    // 3. ดึง prefixes
    const prefixes = await this.prisma.bookPrefix.findMany({
      where: { bookId },
      select: { prefix: true },
    });
    const prefixFilters = prefixes.map((p) => ({
      studentId: { startsWith: p.prefix, mode: 'insensitive' },
    }));

    // 4. สร้าง where clause (role + prefix + search)
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

    const totalItems = await this.prisma.studentProfile.count({
      where: whereClause,
    });

    // 5. ถ้า sortBy === 'percent' → ดึงครบ ปราศจาก skip/take/orderBy
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

    // 6. คำนวณ done/total/percent สำหรับแต่ละ profile
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

        // สร้าง map เพื่อนับจำนวน log ของแต่ละ subCourse
        const logCountsBySubCourse = new Map<string, number>();
        exps.forEach((e) => {
          if (!e.subCourse) return;
          logCountsBySubCourse.set(
            e.subCourse,
            (logCountsBySubCourse.get(e.subCourse) ?? 0) + 1,
          );
        });

        let doneCount = 0;
        // วน loop เพื่อคำนวณยอดที่ทำแล้วโดยเทียบกับยอดที่ต้องการของแต่ละ subCourse
        for (const sub of subs) {
          const count = logCountsBySubCourse.get(sub.name) ?? 0;
          // เช็คโหมด เพื่อเลือกว่าจะเอา required count จากไหน (inSubjectCount หรือ alwaycourse)
          const requiredCount =
            progressMode === 'inSubject'
              ? (sub.inSubjectCount ?? 0)
              : (sub.alwaycourse ?? 0);

          // ยอดที่ทำได้ของแต่ละรายการจะถูกจำกัดไม่ให้เกินยอดที่ต้องการ (capping)
          doneCount += Math.min(count, requiredCount);
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
