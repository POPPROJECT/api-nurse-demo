import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentExperienceDto } from './dto/create-student-experience.dto';
import { UpdateStudentExperienceDto } from './dto/update-student-experience.dto';
import { ExperienceStatus, Prisma, Role } from '@prisma/client';

const MAX_PIN_FAIL = 3; //จำนวนที่กรอกผิดได้
const COOLDOWN_MS = 30 * 60 * 1000; //(60 (นาที) * 60 (วินาที/นาที) * 1000 (มิลลิวินาที/วินาที)) = 1 ชม.

export interface ListQuery {
  bookId: number;
  page: number;
  limit: number;
  search?: string;
  status: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL';
  sortBy?: 'createdAt' | 'course' | 'status';
  order?: 'asc' | 'desc';
}

@Injectable()
export class StudentExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** ✅ 1. สร้างรายการใหม่ */
  async create(dto: CreateStudentExperienceDto, userId: number) {
    const book = await this.prisma.experienceBook.findUnique({
      where: { id: dto.bookId },
    });
    if (!book) throw new NotFoundException('ไม่พบสมุด');

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!studentProfile) throw new NotFoundException('ไม่พบนิสิต');

    if (!Object.values(Role).includes(dto.approverRole as Role)) {
      throw new BadRequestException('approverRole ไม่ถูกต้อง');
    }

    // ✅ โหลด subCourse เพื่อดึงข้อมูล subject / alwaycourse
    const subCourse = await this.prisma.subCourse.findUnique({
      where: { id: dto.subCourseId },
      include: { course: true }, // optional หากคุณต้องการ course.name
    });

    if (!subCourse) throw new NotFoundException('ไม่พบหัวข้อย่อย');

    const experience = await this.prisma.studentExperience.create({
      data: {
        bookId: dto.bookId,
        studentId: studentProfile.id,
        approverRole: dto.approverRole as Role,
        approverName: dto.approverName,
        course: dto.course ?? subCourse.course.name, // fallback หากไม่ได้ส่งมา
        subCourse: dto.subCourse ?? subCourse.name,
        subject: dto.subject ?? subCourse.subject,
        alwaycourse: dto.alwaycourse ?? subCourse.alwaycourse,

        fieldValues: {
          create: dto.fieldValues.map((fv) => ({
            fieldId: fv.fieldId,
            value: fv.value,
          })),
        },
      },
      include: {
        fieldValues: { include: { field: true } },
      },
    });

    return experience;
  }

  /** ✅ 2. ดึงรายการทั้งหมดของนิสิต */
  async findAllOfStudent(userId: number, q: ListQuery) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('ไม่พบนิสิต');

    const {
      bookId,
      page,
      limit,
      search = '',
      status = 'ALL',
      sortBy = 'createdAt',
      order = 'desc',
    } = q;

    const skip = (page - 1) * limit;
    const where: Prisma.StudentExperienceWhereInput = {
      bookId,
      studentId: student.id,
      isDeleted: false,
    };

    if (status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { course: { contains: search, mode: 'insensitive' } },
        { subCourse: { contains: search, mode: 'insensitive' } },
        { approverName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,
        include: { fieldValues: { include: { field: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
    ]);

    return { total, data };
  }

  /** ✅ 3. ดึงรายการเดี่ยว (เฉพาะเจ้าของ) */
  async findOneOfStudent(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: {
        fieldValues: { include: { field: true } },
        student: { select: { userId: true } },
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== userId)
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง');

    return exp;
  }

  private async validateApproverPinByName(approverName: string, pin: string) {
    // หา record ของ profile ผ่าน user.name
    const approverProfile = await this.prisma.approverProfile.findFirst({
      where: { user: { name: approverName } },
    });
    if (!approverProfile) {
      throw new BadRequestException('ไม่มีสิทธิ์ใช้งาน');
    }

    const now = new Date();
    // ยังอยู่ในช่วงล็อค
    if (
      approverProfile.pinLockedUntil &&
      approverProfile.pinLockedUntil > now
    ) {
      const mins = Math.ceil(
        (approverProfile.pinLockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new BadRequestException(
        `กรุณารออีก ${mins} นาที ก่อนกรอก PIN ใหม่`,
      );
    }

    // PIN ผิด
    if (pin !== approverProfile.pin) {
      const fails = (approverProfile.pinFailCount || 0) + 1;
      const updateData: any = { pinFailCount: fails };
      if (fails >= MAX_PIN_FAIL) {
        updateData.pinFailCount = 0;
        updateData.pinLockedUntil = new Date(now.getTime() + COOLDOWN_MS);
      }
      await this.prisma.approverProfile.update({
        where: { id: approverProfile.id },
        data: updateData,
      });
      const msg =
        fails < MAX_PIN_FAIL
          ? `PIN ไม่ถูกต้อง คุณกรอกผิดไป ${fails} จาก ${MAX_PIN_FAIL} ครั้ง`
          : `ระบบถูกล็อก เนื่องจากคุณกรอก PIN ผิดครบ ${MAX_PIN_FAIL} ครั้ง `;
      throw new BadRequestException(msg);
    }

    // PIN ถูก → รีเซ็ต counters
    await this.prisma.approverProfile.update({
      where: { id: approverProfile.id },
      data: { pinFailCount: 0, pinLockedUntil: null },
    });
    return approverProfile;
  }

  /** ✅ 4. Approver ยืนยัน */
  async confirm(id: string, userId: number, pin: string) {
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });

    if (!approver || approver.pin !== pin) {
      throw new BadRequestException('PIN ไม่ถูกต้อง');
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  //ยืนยันหน้า record list แบบเดี่ยว
  async confirmByApprover(
    id: string,
    studentUserId: number,
    approverUserName: string,
    pin: string,
  ) {
    // 1) ตรวจ record เป็นของนิสิตจริง, ชื่อ match แล้ว…
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: { student: { select: { userId: true } } },
    });
    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== studentUserId)
      throw new ForbiddenException('ไม่มีสิทธิ์ยืนยันรายการนี้');
    if (exp.approverName !== approverUserName)
      throw new BadRequestException('รายการนี้ไม่ใช่ของผู้นิเทศท่านนี้');

    // 2) เช็ค PIN + lockout
    await this.validateApproverPinByName(approverUserName, pin);

    // 3) update status
    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  async confirmBulkByApprover(
    studentUserId: number,
    approverUserName: string,
    ids: string[],
    pin: string,
  ) {
    // 1) เช็ค PIN + lockout
    await this.validateApproverPinByName(approverUserName, pin);

    // 2) bulk update (เฉพาะ record ของนิสิตคนนี้ และชื่อผู้นิเทศตรงกัน)
    return this.prisma.studentExperience.updateMany({
      where: {
        id: { in: ids },
        student: { userId: studentUserId },
        approverName: approverUserName,
        status: ExperienceStatus.PENDING,
      },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  /** ✅ 5. Approver ปฏิเสธ */
  async reject(id: string, userId: number, pin: string) {
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });

    if (!approver || approver.pin !== pin) {
      throw new BadRequestException('PIN ไม่ถูกต้อง');
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CANCEL },
    });
  }

  /** ✅ 6. นิสิตยกเลิกเอง */
  async cancelOwn(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: {
        student: { select: { userId: true } },
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== userId)
      throw new ForbiddenException('ไม่สามารถยกเลิกรายการนี้');
    if (exp.status !== ExperienceStatus.PENDING)
      throw new ForbiddenException('ยกเลิกได้เฉพาะสถานะ PENDING');

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CANCEL },
    });
  }

  /** ✅ 7. ลบรายการจริงหลังยกเลิก */
  async deleteOwn(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== userId)
      throw new ForbiddenException('ไม่สามารถลบรายการนี้');

    await this.prisma.studentExperience.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** ✅ 8. แก้ไขรายการ */
  async updateOwn(id: string, userId: number, dto: UpdateStudentExperienceDto) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== userId)
      throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขรายการนี้');
    if (exp.status !== ExperienceStatus.PENDING)
      throw new ForbiddenException('แก้ไขได้เฉพาะสถานะ PENDING');

    const { fieldValues, ...rest } = dto;

    await this.prisma.studentExperience.update({
      where: { id },
      data: rest,
    });

    if (fieldValues) {
      await this.prisma.fieldValue.deleteMany({ where: { experienceId: id } });
      await this.prisma.fieldValue.createMany({
        data: fieldValues.map((fv) => ({
          experienceId: id,
          fieldId: fv.fieldId,
          value: fv.value,
        })),
      });
    }

    return this.prisma.studentExperience.findUnique({
      where: { id },
      include: { fieldValues: { include: { field: true } } },
    });
  }

  async findAllOfStudentByStudentId(studentId: number) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { studentId: studentId.toString() }, // หรือ `id: studentId` ถ้า param คือ id
    });

    if (!student) throw new NotFoundException('ไม่พบนิสิต');

    const data = await this.prisma.studentExperience.findMany({
      where: { studentId: student.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        fieldValues: { include: { field: true } },
      },
    });

    return data;
  }

  async findByStudentId(q: {
    studentId: number; // จริง ๆ คือ userId ที่ส่งมาจาก frontend
    bookId: number;
    page: number;
    limit: number;
    search?: string;
    status?: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL';
    sortBy?: 'createdAt' | 'course' | 'status';
    order?: 'asc' | 'desc';
  }) {
    const {
      studentId: userId, // ✅ เปลี่ยนชื่อชัดเจนว่ามาจาก user
      bookId,
      page,
      limit,
      search = '',
      status = 'ALL',
      sortBy = 'createdAt',
      order = 'desc',
    } = q;

    // ✅ 1) ดึง studentProfileId จาก userId
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!studentProfile) throw new NotFoundException('ไม่พบนิสิต');

    const skip = (page - 1) * limit;

    // ✅ 2) ใช้ studentProfile.id เป็น studentId ใน Prisma query
    const where: Prisma.StudentExperienceWhereInput = {
      studentId: studentProfile.id,
      bookId,
      isDeleted: false,
    };

    if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { course: { contains: search, mode: 'insensitive' } },
        { subCourse: { contains: search, mode: 'insensitive' } },
        { approverName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,
        include: { fieldValues: { include: { field: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
    ]);

    return { total, data };
  }

  async adminDelete(id: string) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
    });
    if (!exp) throw new NotFoundException('ไม่พบรายการ');

    await this.prisma.studentExperience.delete({
      where: { id },
    });
  }
}
