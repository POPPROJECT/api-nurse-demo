import {
  Controller,
  Get,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';

interface JwtRequest extends Request {
  user: {
    /** ใน token อาจเก็บเป็น userId, sub หรือ id */
    userId?: number;
    sub?: number;
    id?: number;
  };
}
@UseGuards(JwtOrSessionGuard)
@Controller('experience-books')
// @UseGuards(JwtAuthGuard)
export class ExperienceBookAuthorizedController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /experience-books/authorized
   * คืนเล่มที่นักเรียนมีสิทธิ์เข้าถึง ตาม prefix ใน studentId
   */
  @Get('authorized')
  async findAuthorized(@Req() req: JwtRequest) {
    const userIdRaw = req.user.userId ?? req.user.sub ?? req.user.id;
    const userId = Number(userIdRaw);
    if (!userId) {
      return [];
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { studentId: true },
    });
    if (!profile?.studentId) {
      return [];
    }

    const studentId = profile.studentId;

    const books = await this.prisma.experienceBook.findMany({
      include: { prefixes: true },
    });

    return books
      .filter((book) =>
        book.prefixes.some((p) => studentId.startsWith(p.prefix)),
      )
      .map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
      }));
  }

  /**
   * GET /experience-books/:bookId/subcourses/stats
   * คืนสถิติการทำ subCourse แต่ละหัวข้อ (เฉพาะ CONFIRMED)
   */
  @Get(':bookId/subcourses/stats')
  async subcourseStats(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Req() req: JwtRequest,
  ) {
    // 1) ดึง userId จาก JWT payload
    const userId = req.user.userId ?? req.user.sub ?? req.user.id;
    if (!userId) {
      return [];
    }

    // 2) หาข้อมูล studentProfile
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, studentId: true },
    });
    if (!profile?.studentId) {
      return [];
    }

    // 3) หาทุก SubCourse ของหนังสือเล่มนี้
    const courses = await this.prisma.course.findMany({
      where: { bookId },
      include: { subCourses: true },
    });
    const allSubs = courses.flatMap((c) => c.subCourses);

    // 4) สำหรับแต่ละ subCourse นับจำนวนนักเรียนที่บันทึก status=CONFIRMED
    const stats = await Promise.all(
      allSubs.map(async (sub) => {
        const count = await this.prisma.studentExperience.count({
          where: {
            bookId,
            studentId: profile.id,
            subCourse: sub.name,
            status: 'CONFIRMED',
          },
        });
        return {
          id: sub.id,
          name: sub.name,
          alwaycourse: sub.alwaycourse,
          _count: { experiences: count },
        };
      }),
    );

    return stats;
  }

  //หน้าcheck-student approver
  /** GET /experience-books/authorized/student/:studentId */
  @Get('authorized/student/:studentId')
  async findForStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    // 1) หา studentProfile ตาม userId = studentId
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { studentId: true },
    });

    if (!profile?.studentId) return [];

    const sid = profile.studentId;

    // 2) ดึงสมุด+prefix ทุกเล่ม
    const books = await this.prisma.experienceBook.findMany({
      include: {
        prefixes: true,
        courses: {
          include: {
            subCourses: true,
          },
        },
      },
    });

    // 3) กรองตาม prefix ของนิสิต
    return books
      .filter((b) => b.prefixes.some((p) => sid.startsWith(p.prefix)))
      .map((b) => ({
        id: b.id,
        title: b.title,
        courses: b.courses.map((c) => ({
          id: c.id,
          name: c.name,
          subCourses: c.subCourses.map((s) => ({
            id: s.id,
            name: s.name,
            alwaycourse: s.alwaycourse,
          })),
        })),
      }));
  }

  /**
   * GET /experience-books/:bookId/subcourses/stats/student/:studentProfileId
   * ดึงสถิติ subcourse ที่นิสิตคนนี้ (studentProfileId) ยืนยันแล้ว
   */
  @Get(':bookId/subcourses/stats/student/:studentProfileId')
  async subcourseStatsForStudent(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('studentProfileId', ParseIntPipe) studentProfileId: number,
  ) {
    // 1) เช็คหนังสือว่ามีจริงไหม
    const book = await this.prisma.experienceBook.findUnique({
      where: { id: bookId },
    });
    if (!book)
      throw new NotFoundException(`ExperienceBook ${bookId} not found`);

    // 2) เช็ค profile ของนิสิตว่ามีไหม
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentProfileId },
    });
    if (!profile)
      throw new NotFoundException(
        `StudentProfile ${studentProfileId} not found`,
      );

    // 3) หา subCourses ทั้งหมดของหนังสือเล่มนี้
    const courses = await this.prisma.course.findMany({
      where: { bookId },
      include: { subCourses: true },
    });
    const allSubs = courses.flatMap((c) => c.subCourses);

    // 4) นับ count ของนิสิตคนนี้ (status = CONFIRMED) แต่ละ subCourse
    const stats = await Promise.all(
      allSubs.map(async (sub) => {
        const cnt = await this.prisma.studentExperience.count({
          where: {
            bookId,
            studentId: profile.id,
            subCourse: sub.name,
            status: 'CONFIRMED',
          },
        });
        return {
          id: sub.id,
          name: sub.name,
          alwaycourse: sub.alwaycourse,
          _count: { experiences: cnt },
        };
      }),
    );

    return stats;
  }
}
