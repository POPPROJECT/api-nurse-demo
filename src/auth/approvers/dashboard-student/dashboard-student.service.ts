import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExperienceStatus } from '@prisma/client';

export interface SubProgress {
  id: number;
  name: string;
  alwaycourse: number;
  doneCount: number;
  percent: number;
}

export interface CourseProgress {
  id: number;
  name: string;
  totalUnits: number;
  doneUnits: number;
  percent: number;
  subProgress: SubProgress[];
}

export interface DashboardData {
  totalStudents: number;
  completedStudents: number;
  overallProgress: number;
  courseProgress: CourseProgress[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(bookId: number): Promise<DashboardData> {
    if (!bookId) throw new BadRequestException('ต้องระบุ bookId');

    // 1) ดึง course และ subCourse ที่อยู่ใน book นี้
    const courses = await this.prisma.course.findMany({
      where: { bookId },
      include: {
        subCourses: { select: { id: true, name: true, alwaycourse: true } },
      },
    });

    // 2) ดึง prefix ที่อนุญาต เช่น ['64', '65']
    const allowedPrefixes = await this.prisma.bookPrefix.findMany({
      where: { bookId },
      select: { prefix: true },
    });

    // 3) ดึงนิสิตทั้งหมดที่ studentId ไม่ null และมี user ENABLE
    const allStudents = await this.prisma.studentProfile.findMany({
      where: {
        user: { status: 'ENABLE' },
        studentId: { not: null },
      },
      select: { id: true, studentId: true },
    });

    // 4) กรองนิสิตที่ studentId ตรงกับ prefix ที่อนุญาต
    const allowedStudentIds = allStudents
      .filter((s) =>
        allowedPrefixes.some((p) => s.studentId!.startsWith(p.prefix)),
      )
      .map((s) => s.id);

    const totalStudents = allowedStudentIds.length;

    // 5) เตรียม studentMap ว่างไว้เก็บ log
    const studentMap = new Map<number, Map<string, number>>();
    for (const id of allowedStudentIds) {
      studentMap.set(id, new Map());
    }

    // 6) ดึง logs ที่ CONFIRMED เฉพาะของนิสิตที่ได้รับอนุญาต
    const experiences = await this.prisma.studentExperience.findMany({
      where: {
        bookId,
        isDeleted: false,
        status: ExperienceStatus.CONFIRMED,
        studentId: { in: allowedStudentIds },
      },
      select: { studentId: true, subCourse: true },
    });

    // 7) เติมข้อมูล log ลงใน studentMap
    for (const e of experiences) {
      if (!e.subCourse) continue;
      const m = studentMap.get(e.studentId);
      if (!m) continue;
      m.set(e.subCourse, (m.get(e.subCourse) ?? 0) + 1);
    }

    // 8) หานิสิตที่ครบทุก subCourse
    const completedStudents = Array.from(studentMap.values()).filter((subMap) =>
      courses.every((course) =>
        course.subCourses.every(
          (sub) => (subMap.get(sub.name) ?? 0) >= (sub.alwaycourse ?? 0),
        ),
      ),
    ).length;

    // 9) คำนวณ progress
    let totalUnitsAll = 0;
    let doneUnitsAll = 0;

    const courseProgress: CourseProgress[] = courses.map((course) => {
      // 9.1) per-subProgress
      const subProgress: SubProgress[] = course.subCourses.map((sub) => {
        // sum doneCount across all students, cap per student at alwaycourse
        const doneCount = Array.from(studentMap.values()).reduce(
          (sum, m) =>
            sum + Math.min(m.get(sub.name) ?? 0, sub.alwaycourse ?? 0),
          0,
        );
        const percent = totalStudents
          ? Math.round(
              (doneCount / ((sub.alwaycourse ?? 0) * totalStudents)) * 100,
            )
          : 0;
        return {
          id: sub.id,
          name: sub.name,
          alwaycourse: sub.alwaycourse ?? 0,
          doneCount,
          percent,
        };
      });

      // 9.2) per-course totals
      const unitsPerStudent = course.subCourses.reduce(
        (s, sub) => s + (sub.alwaycourse ?? 0),
        0,
      );
      const totalUnits = unitsPerStudent * totalStudents;
      const doneUnits = subProgress.reduce(
        (s, sp) =>
          s + Math.min(sp.doneCount, (sp.alwaycourse ?? 0) * totalStudents),
        0,
      );

      totalUnitsAll += totalUnits;
      doneUnitsAll += doneUnits;

      const percent = totalUnits
        ? Math.round((doneUnits / totalUnits) * 100)
        : 0;

      return {
        id: course.id,
        name: course.name,
        totalUnits,
        doneUnits,
        percent,
        subProgress,
      };
    });

    const overallProgress =
      totalUnitsAll > 0 ? Math.round((doneUnitsAll / totalUnitsAll) * 100) : 0;

    return {
      totalStudents,
      completedStudents,
      overallProgress,
      courseProgress,
    };
  }
}

@Injectable()
export class DashboardSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardBySubject(
    bookId: number,
    courseId: number,
  ): Promise<DashboardData> {
    if (!bookId || !courseId) {
      throw new BadRequestException('ต้องระบุ bookId และ courseId');
    }

    // 1) ดึง "รายวิชา" (Course) ที่เลือก พร้อมหมวดหมู่ย่อย (subCourses)
    const selectedCourse = await this.prisma.course.findUnique({
      where: { id: courseId, bookId: bookId }, // ตรวจสอบว่า courseId อยู่ใน bookId จริง
      include: {
        subCourses: { select: { id: true, name: true, alwaycourse: true } },
      },
    });

    if (!selectedCourse) {
      throw new NotFoundException('ไม่พบรายวิชาที่ระบุในสมุดเล่มนี้');
    }

    // 2) ดึง prefix และนิสิตที่ได้รับอนุญาต (เหมือนเดิม)
    const allowedPrefixes = await this.prisma.bookPrefix.findMany({
      where: { bookId },
      select: { prefix: true },
    });
    const allStudents = await this.prisma.studentProfile.findMany({
      where: { user: { status: 'ENABLE' }, studentId: { not: null } },
      select: { id: true, studentId: true },
    });
    const allowedStudentIds = allStudents
      .filter((s) =>
        allowedPrefixes.some((p) => s.studentId!.startsWith(p.prefix)),
      )
      .map((s) => s.id);
    const totalStudents = allowedStudentIds.length;

    // 3) ดึง log และสร้าง studentMap (เหมือนเดิม)
    const studentMap = new Map<number, Map<string, number>>();
    allowedStudentIds.forEach((id) => studentMap.set(id, new Map()));

    const experiences = await this.prisma.studentExperience.findMany({
      where: {
        bookId,
        isDeleted: false,
        status: ExperienceStatus.CONFIRMED,
        studentId: { in: allowedStudentIds },
        // กรอง log ให้เอาเฉพาะที่อยู่ในรายวิชา (course) ที่เลือก
        course: selectedCourse.name,
      },
      select: { studentId: true, subCourse: true },
    });

    for (const e of experiences) {
      if (!e.subCourse) continue;
      const m = studentMap.get(e.studentId);
      if (m) m.set(e.subCourse, (m.get(e.subCourse) ?? 0) + 1);
    }

    // 4) [คำนวณใหม่] หานิสิตที่ทำครบถ้วน "เฉพาะในรายวิชานี้"
    const completedStudents = Array.from(studentMap.values()).filter((subMap) =>
      selectedCourse.subCourses.every(
        (sub) => (subMap.get(sub.name) ?? 0) >= (sub.alwaycourse ?? 0),
      ),
    ).length;

    // 5) [คำนวณใหม่] ความคืบหน้าทั้งหมด "เฉพาะในรายวิชานี้"
    let totalUnitsAll = 0;
    let doneUnitsAll = 0;

    const courseProgress: CourseProgress[] = [selectedCourse].map((course) => {
      // วน loop แค่ course เดียว
      const subProgress: SubProgress[] = course.subCourses.map((sub) => {
        const doneCount = Array.from(studentMap.values()).reduce(
          (sum, m) =>
            sum + Math.min(m.get(sub.name) ?? 0, sub.alwaycourse ?? 0),
          0,
        );
        const percent =
          totalStudents > 0
            ? Math.round(
                (doneCount / ((sub.alwaycourse ?? 0) * totalStudents)) * 100,
              )
            : 0;
        return {
          id: sub.id,
          name: sub.name,
          alwaycourse: sub.alwaycourse ?? 0,
          doneCount,
          percent,
        };
      });

      const unitsPerStudent = course.subCourses.reduce(
        (s, sub) => s + (sub.alwaycourse ?? 0),
        0,
      );
      const totalUnits = unitsPerStudent * totalStudents;
      const doneUnits = subProgress.reduce((s, sp) => s + sp.doneCount, 0);

      totalUnitsAll += totalUnits;
      doneUnitsAll += doneUnits;

      const percent =
        totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

      return {
        id: course.id,
        name: course.name,
        totalUnits,
        doneUnits,
        percent,
        subProgress,
      };
    });

    const overallProgress =
      totalUnitsAll > 0 ? Math.round((doneUnitsAll / totalUnitsAll) * 100) : 0;

    return {
      totalStudents,
      completedStudents,
      overallProgress,
      courseProgress,
    };
  }
}
