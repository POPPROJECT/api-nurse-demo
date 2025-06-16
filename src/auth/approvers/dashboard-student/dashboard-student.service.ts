// backend/src/approver/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// --- TYPE DEFINITIONS (UPDATED) ---
export interface Subcategory {
  id: number;
  name: string;
  required: number;
  totalDone: number; // Total experiences logged by all students
  percent: number;
  studentCount: number; // Total students for this book
  doneStudentCount: number; // Students who met the 'required' count
}
export interface CourseProgress {
  id: number;
  name: string;
  percent: number;
  studentCount: number;
  doneStudentCount: number;
  subcategories: Subcategory[];
}
export interface DashboardData {
  totalStudents: number;
  completedStudents: number;
  overallProgress: {
    required: number;
    done: number; // Average done
    percent: number;
  };
  courseProgress: CourseProgress[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // No changes needed in private helper methods
  private async _getAllowedStudentIds(bookId: number): Promise<number[]> {
    const prefixes = (
      await this.prisma.bookPrefix.findMany({
        where: { bookId },
        select: { prefix: true },
      })
    ).map((p) => p.prefix);
    if (prefixes.length === 0) return [];

    const students = await this.prisma.studentProfile.findMany({
      where: { user: { status: 'ENABLE' }, studentId: { not: null } },
      select: { id: true, studentId: true },
    });
    return students
      .filter((s) => prefixes.some((p) => s.studentId!.startsWith(p)))
      .map((s) => s.id);
  }

  private async _getStudentExperienceMap(
    bookId: number,
    studentIds: number[],
  ): Promise<Map<number, Map<string, number>>> {
    const studentMap = new Map<number, Map<string, number>>();
    if (studentIds.length === 0) return studentMap;
    studentIds.forEach((id) => studentMap.set(id, new Map()));
    const experiences = await this.prisma.studentExperience.findMany({
      where: {
        bookId,
        studentId: { in: studentIds },
        status: 'CONFIRMED',
        isDeleted: false,
      },
      select: { studentId: true, subCourse: true },
    });
    for (const exp of experiences) {
      if (!exp.subCourse) continue;
      const studentSubMap = studentMap.get(exp.studentId);
      if (studentSubMap) {
        studentSubMap.set(
          exp.subCourse,
          (studentSubMap.get(exp.subCourse) ?? 0) + 1,
        );
      }
    }
    return studentMap;
  }

  private _getRequiredCount(
    subCourse: { alwaycourse?: number | null; inSubjectCount?: number | null },
    viewMode: 'OVERALL' | 'BY_SUBJECT',
  ): number {
    // ✅ Use alwaycourse for 'OVERALL' and inSubjectCount for 'BY_SUBJECT'
    return (
      (viewMode === 'OVERALL'
        ? subCourse.alwaycourse
        : subCourse.inSubjectCount) ?? 0
    );
  }

  // --- REFACTORED AND ENHANCED DASHBOARD CALCULATION ---
  private async _calculateDashboard(
    bookId: number,
    viewMode: 'OVERALL' | 'BY_SUBJECT',
  ): Promise<DashboardData> {
    const allowedStudentIds = await this._getAllowedStudentIds(bookId);
    const totalStudents = allowedStudentIds.length;
    if (totalStudents === 0)
      return {
        totalStudents: 0,
        completedStudents: 0,
        overallProgress: { required: 0, done: 0, percent: 100 },
        courseProgress: [],
      };

    const courses = await this.prisma.course.findMany({
      where: { bookId },
      include: { subCourses: true },
    });
    const studentMap = await this._getStudentExperienceMap(
      bookId,
      allowedStudentIds,
    );

    const studentLogs = Array.from(studentMap.values());

    const courseProgress = courses.map((course) => {
      let totalCourseDoneAgg = 0;
      let totalCourseRequiredAgg = 0;

      const subcategories: Subcategory[] = course.subCourses.map((sub) => {
        const required = this._getRequiredCount(sub, viewMode);
        if (required <= 0) {
          return {
            id: sub.id,
            name: sub.name,
            required: 0,
            totalDone: 0,
            percent: 100,
            studentCount: totalStudents,
            doneStudentCount: totalStudents,
          };
        }

        let totalDoneByAllStudents = 0;
        let doneStudentCount = 0;

        studentLogs.forEach((sMap) => {
          const doneCount = sMap.get(sub.name) ?? 0;
          totalDoneByAllStudents += doneCount;
          if (doneCount >= required) {
            doneStudentCount++;
          }
        });

        totalCourseDoneAgg += Math.min(
          totalDoneByAllStudents,
          required * totalStudents,
        );
        totalCourseRequiredAgg += required * totalStudents;

        const percent = Math.min(
          100,
          Math.round(
            (totalDoneByAllStudents / (required * totalStudents)) * 100,
          ),
        );

        return {
          id: sub.id,
          name: sub.name,
          required: required,
          totalDone: totalDoneByAllStudents,
          percent: percent,
          studentCount: totalStudents,
          doneStudentCount: doneStudentCount,
        };
      });

      const coursePercent =
        totalCourseRequiredAgg > 0
          ? Math.min(
              100,
              Math.round((totalCourseDoneAgg / totalCourseRequiredAgg) * 100),
            )
          : 100;
      const courseDoneStudentCount = studentLogs.filter((sMap) =>
        course.subCourses.every(
          (sub) =>
            (sMap.get(sub.name) ?? 0) >= this._getRequiredCount(sub, viewMode),
        ),
      ).length;

      return {
        id: course.id,
        name: course.name,
        percent: coursePercent,
        studentCount: totalStudents,
        doneStudentCount: courseDoneStudentCount,
        subcategories: subcategories.filter((s) => s.required > 0), // Only include subcategories with requirements
      };
    });

    const allSubCourses = courses.flatMap((c) => c.subCourses);
    const completedStudents = studentLogs.filter((sMap) =>
      allSubCourses.every(
        (sub) =>
          (sMap.get(sub.name) ?? 0) >= this._getRequiredCount(sub, viewMode),
      ),
    ).length;

    const overallRequiredSum = allSubCourses.reduce(
      (sum, sub) => sum + this._getRequiredCount(sub, viewMode),
      0,
    );
    const overallDoneSum = studentLogs.reduce((total, sMap) => {
      return (
        total +
        allSubCourses.reduce((subTotal, sub) => {
          return (
            subTotal +
            Math.min(
              sMap.get(sub.name) ?? 0,
              this._getRequiredCount(sub, viewMode),
            )
          );
        }, 0)
      );
    }, 0);

    const overallPercent =
      overallRequiredSum > 0
        ? Math.round(
            (overallDoneSum / (overallRequiredSum * totalStudents)) * 100,
          )
        : 100;

    return {
      totalStudents,
      completedStudents,
      overallProgress: {
        required: overallRequiredSum,
        done: Math.round(overallDoneSum / totalStudents), // Average done
        percent: overallPercent,
      },
      courseProgress: courseProgress.filter((c) => c.subcategories.length > 0),
    };
  }

  async getDashboardOverall(bookId: number): Promise<DashboardData> {
    return this._calculateDashboard(bookId, 'OVERALL');
  }

  async getDashboardBySubject(bookId: number): Promise<DashboardData> {
    return this._calculateDashboard(bookId, 'BY_SUBJECT');
  }

  async getStudentsForCategory(
    bookId: number,
    categoryId: number,
    type: 'course' | 'subcategory',
    viewMode: 'OVERALL' | 'BY_SUBJECT',
  ) {
    const allowedStudentIds = await this._getAllowedStudentIds(bookId);
    if (allowedStudentIds.length === 0) return [];

    const studentProfiles = await this.prisma.studentProfile.findMany({
      where: { id: { in: allowedStudentIds } },
      select: { id: true, studentId: true, user: { select: { name: true } } },
    });

    const studentMap = await this._getStudentExperienceMap(
      bookId,
      allowedStudentIds,
    );

    let relevantSubCourses: { name: string; required: number }[] = [];
    if (type === 'course') {
      const course = await this.prisma.course.findUnique({
        where: { id: categoryId },
        include: { subCourses: true },
      });

      if (!course) return [];

      relevantSubCourses = course.subCourses.map((sc) => ({
        name: sc.name,
        required: this._getRequiredCount(sc, viewMode),
      }));
    } else {
      const subCourse = await this.prisma.subCourse.findUnique({
        where: { id: categoryId },
      });

      if (!subCourse) return [];

      relevantSubCourses = [
        {
          name: subCourse.name,
          required: this._getRequiredCount(subCourse, viewMode),
        },
      ];
    }

    relevantSubCourses = relevantSubCourses.filter((sc) => sc.required > 0);
    const totalRequired = relevantSubCourses.reduce(
      (sum, sc) => sum + sc.required,
      0,
    );

    const studentDataProfile = studentProfiles.map((profile) => {
      const studentLogs = studentMap.get(profile.id) ?? new Map();
      let completedCount = 0;

      relevantSubCourses.forEach((sc) => {
        const count = studentLogs.get(sc.name) ?? 0;
        completedCount += Math.min(count, sc.required);
      });

      return {
        id: profile.studentId,
        name: profile.user.name,
        completed: completedCount,
        total: totalRequired,
        status: completedCount >= totalRequired ? 'completed' : 'incomplete',
      };
    });

    return studentDataProfile;
  }
}
