//backend\src\auth\student-experiences\student-experiences.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentExperienceDto } from './dto/create-student-experience.dto';
import { UpdateStudentExperienceDto } from './dto/update-student-experience.dto';
import { ExperienceStatus, Prisma } from '@prisma/client';

const MAX_PIN_FAIL = 3;

const COOLDOWN_MS = 30 * 60 * 1000;

export interface ListQuery {
  bookId: number;
  page: number;
  limit: number;
  search?: string;
  status: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL';
  sortBy?: 'createdAt' | 'status' | 'course';
  order?: 'asc' | 'desc';
}

@Injectable()
export class StudentExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** ✅ 1. สร้างรายการใหม่ */

  async create(dto: CreateStudentExperienceDto, userId: number) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!studentProfile) {
      throw new NotFoundException('ไม่พบข้อมูลโปรไฟล์นิสิต');
    }

    const subCourse = await this.prisma.subCourse.findUnique({
      where: { id: dto.subCourseId },
      include: { course: true },
    });

    if (!subCourse) {
      throw new NotFoundException('ไม่พบหัวข้อย่อย (SubCourse)');
    }

    if (subCourse.course.bookId !== dto.bookId) {
      throw new BadRequestException('หัวข้อที่เลือกไม่อยู่ในสมุดเล่มนี้');
    }

    // [แก้ไข] Syntax การสร้าง record ที่มี relation

    // เราจะใช้ `connect` เพื่อเชื่อมไปยัง ID ที่มีอยู่แล้ว แทนการระบุ courseId, subCourseId โดยตรง

    const experience = await this.prisma.studentExperience.create({
      data: {
        approverRole: dto.approverRole,
        approverName: dto.approverName,
        status: ExperienceStatus.PENDING,

        subject: dto.subject, // <-- [เพิ่ม] บันทึก subject จาก DTO ลง DB

        student: { connect: { id: studentProfile.id } },
        book: { connect: { id: dto.bookId } },
        course: { connect: { id: subCourse.courseId } },
        subCourse: { connect: { id: dto.subCourseId } },

        // สร้าง FieldValues ที่ผูกกับ Experience นี้

        fieldValues: {
          create: dto.fieldValues.map((fv) => ({
            fieldId: fv.fieldId,
            value: fv.value,
          })),
        },
      },

      include: {
        fieldValues: { include: { field: true } },
        course: true,
        subCourse: true,
      },
    });

    return experience;
  }

  /** ✅ 2. [แก้ไข] ดึงรายการทั้งหมดของนิสิต พร้อมข้อมูลจาก Course และ SubCourse */
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

    // Logic การเรียงข้อมูล
    const orderBy =
      sortBy === 'course' ? { course: { name: order } } : { [sortBy]: order };
    const skip = (page - 1) * limit;

    // Logic การกรองข้อมูล
    const where: Prisma.StudentExperienceWhereInput = {
      bookId,
      studentId: student.id,
      isDeleted: false,
    };
    if (status !== 'ALL') where.status = status as ExperienceStatus;
    if (search) {
      where.OR = [
        { course: { name: { contains: search, mode: 'insensitive' } } },
        { subCourse: { name: { contains: search, mode: 'insensitive' } } },
        { approverName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ดึงข้อมูลจากฐานข้อมูล
    const [total, rawData] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,
        include: {
          fieldValues: { include: { field: true } },
          course: { select: { id: true, name: true } }, // ดึงทั้ง id และ name
          subCourse: {
            select: {
              id: true,
              name: true,
              alwaycourse: true,
              inSubjectCount: true,
              isSubjectFreeform: true,
            },
          },
          // ▲▲▲ [สิ้นสุดส่วนที่แก้ไข] ▲▲▲
        },
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    // จัดรูปแบบข้อมูลใหม่ให้แบนราบ และตรงตามที่ Frontend ต้องการ
    const data = rawData.map((exp) => {
      const { course, subCourse, ...restOfExp } = exp;
      return {
        ...restOfExp,
        course: course, // ส่งไปทั้ง object { id, name }
        subCourse: subCourse, // ส่งไปทั้ง object
        // ไม่ต้อง map field อื่นๆ อีกแล้ว เพราะมันอยู่ใน object subCourse
      };
    });
    // ▲▲▲ [สิ้นสุดส่วนที่เพิ่ม] ▲▲▲

    // [แก้ไข] ไม่ต้องทำการ map หรือแปลงข้อมูลอีกต่อไป เพราะข้อมูลถูกต้องแล้ว
    return { total, data };
  }

  /** ✅ 3. ดึงรายการเดี่ยว (เฉพาะเจ้าของ) */
  async findOneOfStudent(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: {
        fieldValues: { include: { field: true } },
        student: { select: { userId: true } },
        course: true,
        subCourse: true,
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');
    if (exp.student.userId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงรายการนี้');
    }

    // [แก้ไข] ไม่ต้องแปลงข้อมูล ตัด student ออกแล้ว return ได้เลย
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { student, ...result } = exp;
    return result;
  }

  private async validateApproverPinByName(approverName: string, pin: string) {
    const approverProfile = await this.prisma.approverProfile.findFirst({
      where: { user: { name: approverName } },
    });

    if (!approverProfile) {
      throw new BadRequestException('ไม่พบข้อมูล Approver');
    }

    const now = new Date();

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

    if (pin !== approverProfile.pin) {
      const fails = approverProfile.pinFailCount + 1;
      let updateData: Prisma.ApproverProfileUpdateInput = {
        pinFailCount: fails,
      };

      if (fails >= MAX_PIN_FAIL) {
        updateData = {
          pinFailCount: 0,
          pinLockedUntil: new Date(now.getTime() + COOLDOWN_MS),
        };
      }

      await this.prisma.approverProfile.update({
        where: { id: approverProfile.id },
        data: updateData,
      });

      const msg =
        fails < MAX_PIN_FAIL
          ? `PIN ไม่ถูกต้อง (พยายาม ${fails}/${MAX_PIN_FAIL} ครั้ง)`
          : `คุณกรอก PIN ผิดครบ ${MAX_PIN_FAIL} ครั้ง บัญชีถูกระงับชั่วคราว`;

      throw new BadRequestException(msg);
    }

    if (approverProfile.pinFailCount > 0) {
      await this.prisma.approverProfile.update({
        where: { id: approverProfile.id },
        data: {
          pinFailCount: 0,
          pinLockedUntil: null,
        },
      });
    }

    return approverProfile;
  }

  /** ✅ 4. Approver ยืนยัน (สำหรับผู้ที่ login อยู่) */

  async confirm(id: string, userId: number, pin: string) {
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });

    if (!approver) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เป็น Approver');
    }

    if (approver.pin !== pin) {
      throw new BadRequestException('PIN ไม่ถูกต้อง');
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  /** ยืนยันรายการเดี่ยวโดย Approver (จากหน้าของนิสิต) */

  async confirmByApprover(
    id: string,
    studentUserId: number,
    approverUserName: string,
    pin: string,
  ) {
    const exp = await this.prisma.studentExperience.findFirst({
      where: {
        id,
        student: { userId: studentUserId },
        approverName: approverUserName,
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการที่ตรงเงื่อนไข');

    await this.validateApproverPinByName(approverUserName, pin);

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CONFIRMED },
    });
  }

  /** ยืนยันหลายรายการโดย Approver (จากหน้าของนิสิต) */

  async confirmBulkByApprover(
    studentUserId: number,
    approverUserName: string,
    ids: string[],
    pin: string,
  ) {
    await this.validateApproverPinByName(approverUserName, pin);

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

  /** ✅ 5. Approver ปฏิเสธ (สำหรับผู้ที่ login อยู่) */

  async reject(id: string, userId: number, pin: string) {
    const approver = await this.prisma.approverProfile.findUnique({
      where: { userId },
    });

    if (!approver) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เป็น Approver');
    }

    if (approver.pin !== pin) {
      throw new BadRequestException('PIN ไม่ถูกต้อง');
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CANCEL },
    });
  }

  /** ✅ 6. นิสิตยกเลิกเอง */

  async cancelOwn(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findFirst({
      where: {
        id,
        student: { userId: userId },
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ หรือคุณไม่มีสิทธิ์');

    if (exp.status !== ExperienceStatus.PENDING) {
      throw new ForbiddenException(
        'ยกเลิกได้เฉพาะรายการที่อยู่ในสถานะ PENDING',
      );
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { status: ExperienceStatus.CANCEL },
    });
  }

  /** ✅ 7. ลบรายการ (Soft Delete) */

  async deleteOwn(id: string, userId: number) {
    const exp = await this.prisma.studentExperience.findFirst({
      where: {
        id,
        student: { userId },
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ หรือคุณไม่มีสิทธิ์');

    if (exp.status === ExperienceStatus.CONFIRMED) {
      throw new ForbiddenException('ไม่สามารถลบรายการที่ยืนยันแล้วได้');
    }

    return this.prisma.studentExperience.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** ✅ 8. แก้ไขรายการโดยนิสิต */

  async updateOwn(id: string, userId: number, dto: UpdateStudentExperienceDto) {
    const exp = await this.prisma.studentExperience.findFirst({
      where: {
        id,
        student: { userId },
      },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ หรือคุณไม่มีสิทธิ์');

    if (exp.status !== ExperienceStatus.PENDING) {
      throw new ForbiddenException('แก้ไขได้เฉพาะรายการที่อยู่ในสถานะ PENDING');
    }

    const { fieldValues, ...otherData } = dto;

    const dataToUpdate: Prisma.StudentExperienceUpdateInput = {};

    if (otherData.approverName) {
      dataToUpdate.approverName = otherData.approverName;
    }

    // [แก้ไข] แก้ไข $transaction ให้ถูกต้องตาม Type

    // Error TS2345 จะหายไปหลังจาก `prisma generate` และแก้ Type ของ transaction

    const transactionOperations: Prisma.PrismaPromise<any>[] = [];

    if (Object.keys(dataToUpdate).length > 0) {
      transactionOperations.push(
        this.prisma.studentExperience.update({
          where: { id },
          data: dataToUpdate,
        }),
      );
    }

    if (fieldValues && fieldValues.length > 0) {
      transactionOperations.push(
        this.prisma.fieldValue.deleteMany({ where: { experienceId: id } }),
      );

      transactionOperations.push(
        this.prisma.fieldValue.createMany({
          data: fieldValues.map((fv) => ({
            experienceId: id,
            fieldId: fv.fieldId,
            value: fv.value,
          })),
        }),
      );
    }

    if (transactionOperations.length > 0) {
      await this.prisma.$transaction(transactionOperations);
    }

    await this.prisma.$transaction(transactionOperations);

    // [แก้ไข] ดึงข้อมูลล่าสุดมาแปลงก่อนส่งกลับ

    const updatedExp = await this.prisma.studentExperience.findUnique({
      where: { id },
      include: {
        fieldValues: { include: { field: true } },
        course: true,
        subCourse: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
      },
    });

    // [แก้ไข] แปลงข้อมูลก่อนส่งกลับ
    if (!updatedExp) return null;
    const { subCourse, ...result } = updatedExp;
    return {
      ...result,
      subject: subCourse?.subject,
    };
  }

  /** (Bonus) ค้นหารายการของนิสิต (สำหรับ Approver/Admin) */

  async findByStudentId(q: {
    studentId: number;
    bookId: number;
    page: number;
    limit: number;
    search?: string;
    status?: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL';
    sortBy?: 'createdAt' | 'status' | 'course';
    order?: 'asc' | 'desc';
  }) {
    const {
      studentId: userId,
      bookId,
      page,
      limit,
      search = '',
      status = 'ALL',
      sortBy = 'createdAt',
      order = 'desc',
    } = q;

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!studentProfile) throw new NotFoundException('ไม่พบข้อมูลโปรไฟล์นิสิต');
    const skip = (page - 1) * limit;

    const where: Prisma.StudentExperienceWhereInput = {
      studentId: studentProfile.id,
      bookId,
      isDeleted: false,
    };

    if (status !== 'ALL') {
      where.status = status as ExperienceStatus;
    }

    if (search) {
      where.OR = [
        {
          course: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          subCourse: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          approverName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const orderBy =
      sortBy === 'course' ? { course: { name: order } } : { [sortBy]: order };

    const [total, rawData] = await this.prisma.$transaction([
      this.prisma.studentExperience.count({ where }),
      this.prisma.studentExperience.findMany({
        where,

        include: {
          fieldValues: { include: { field: true } },
          course: true,
          subCourse: {
            select: {
              id: true,
              name: true,
              subject: true,
            },
          },
        },

        skip,

        take: limit,

        orderBy, // <-- ใช้ orderBy ที่ถูกต้อง
      }),
    ]);

    // [แก้ไข] เรียกใช้ helper เพื่อแปลงข้อมูลก่อนส่งกลับ

    // [แก้ไข] แปลงข้อมูลโดยตรงในฟังก์ชันนี้
    const data = rawData.map((exp) => {
      const { subCourse, ...rest } = exp;
      return {
        ...rest,
        course: exp.course,
        subCourse: {
          id: subCourse.id,
          name: subCourse.name,
        },
        subject: subCourse?.subject,
      };
    });

    return {
      total,
      data,
    };
  }

  /** (Admin) ลบข้อมูลอย่างถาวร */
  async adminDelete(id: string) {
    const exp = await this.prisma.studentExperience.findUnique({
      where: { id },
    });

    if (!exp) throw new NotFoundException('ไม่พบรายการ');

    return this.prisma.studentExperience.delete({
      where: { id },
    });
  }
}
