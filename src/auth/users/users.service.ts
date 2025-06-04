import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User, UserStatus } from '@prisma/client';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { AdminLogService } from '../admin/admin-log/admin-log.service';
import { ImportUserDto } from '../dto/import-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private adminLogService: AdminLogService,
  ) {}

  async getMyUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        approverProfile: true,
        adminProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { password, ...safeUser } = user;
    return { user: safeUser };
  }

  async getUsers() {
    return await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { status },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        approverProfile: true,
        adminProfile: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        approverProfile: true,
        adminProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUsersByRole(role?: string) {
    const validRoles: Role[] = [
      'STUDENT',
      'APPROVER_IN',
      'APPROVER_OUT',
      'ADMIN',
      'EXPERIENCE_MANAGER',
    ];

    const normalized = role?.toUpperCase();

    if (normalized && !validRoles.includes(normalized as Role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    return this.prisma.user.findMany({
      where: normalized ? { role: normalized as Role } : {},
      include: {
        approverProfile: true,
        studentProfile: normalized === 'STUDENT',
      },
    });
  }

  async updateProfile(
    userId: number,
    body: {
      fullname?: string;
      studentId?: string;
      pin?: string;
      password?: string;
    },
    avatar?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        approverProfile: true,
        studentProfile: true,
        adminProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const dataToUpdate: any = {
      name: body.fullname,
    };

    if (body.studentId && user.role === 'STUDENT') {
      await this.prisma.studentProfile.upsert({
        where: { userId },
        update: { studentId: body.studentId },
        create: { userId, studentId: body.studentId },
      });
    }

    if (
      body.pin &&
      (user.role === 'APPROVER_IN' || user.role === 'APPROVER_OUT')
    ) {
      await this.prisma.approverProfile.upsert({
        where: { userId },
        update: { pin: body.pin },
        create: { userId, pin: body.pin },
      });

      if (body.password && body.password.length >= 3) {
        const hashed = await argon2.hash(body.password);
        dataToUpdate.password = hashed;
      }
    }

    if (avatar && user.avatarUrl) {
      const oldFile = user.avatarUrl.replace('/uploads/', '');
      const oldPath = join(process.cwd(), 'uploads', oldFile);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }

    if (avatar) {
      const ext = avatar.originalname.split('.').pop();
      const filename = `avatar-${userId}-${Date.now()}.${ext}`;
      const uploadPath = join(process.cwd(), 'uploads', filename);
      writeFileSync(uploadPath, avatar.buffer);
      dataToUpdate.avatarUrl = `/uploads/${filename}`;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        studentProfile: true,
        approverProfile: true,
        adminProfile: true,
      },
    });
  }

  async deleteUser(id: number, adminId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          studentProfile: { include: { experiences: true } },
          approverProfile: true,
          adminProfile: true,
        },
      });

      if (!user) throw new Error('User not found');

      if (user.studentProfile) {
        const experienceIds = user.studentProfile.experiences.map(
          (exp) => exp.id,
        );

        await this.prisma.fieldValue.deleteMany({
          where: { experienceId: { in: experienceIds } },
        });

        await this.prisma.studentExperience.deleteMany({
          where: { id: { in: experienceIds } },
        });

        await this.prisma.studentProfile.delete({
          where: { id: user.studentProfile.id },
        });
      }

      if (user.approverProfile) {
        await this.prisma.approverProfile.delete({
          where: { id: user.approverProfile.id },
        });
      }

      if (user.adminProfile) {
        await this.prisma.adminProfile.delete({
          where: { id: user.adminProfile.id },
        });
      }

      const deletedUser = await this.prisma.user.delete({
        where: { id },
      });

      await this.adminLogService.createLog({
        userId: adminId,
        action: 'delete',
        entity: 'User',
        entityId: deletedUser.id,
        description: `Deleted user: ${deletedUser.email}`,
      });

      return deletedUser;
    } catch (error) {
      console.error('❌ ลบผู้ใช้ล้มเหลว:', error);
      throw new Error('ไม่สามารถลบข้อมูลได้');
    }
  }

  async adminUpdateUser(
    id: number,
    data: {
      name?: string;
      email?: string;
      pin?: string;
      password?: string;
      studentId?: string;
    },
    adminId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { approverProfile: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const updateUserData: any = {};
    if (data.name) updateUserData.name = data.name;
    if (data.email) updateUserData.email = data.email;

    if (
      data.password &&
      data.password.length >= 3 &&
      user.role === 'APPROVER_OUT'
    ) {
      const hashed = await argon2.hash(data.password);
      updateUserData.password = hashed;
    }

    if (
      data.pin &&
      (user.role === 'APPROVER_IN' || user.role === 'APPROVER_OUT')
    ) {
      await this.prisma.approverProfile.upsert({
        where: { userId: id },
        update: { pin: data.pin },
        create: { userId: id, pin: data.pin },
      });
    }

    if (data.studentId && user.role === 'STUDENT') {
      await this.prisma.studentProfile.upsert({
        where: { userId: id },
        update: { studentId: data.studentId },
        create: { userId: id, studentId: data.studentId },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateUserData,
      include: { approverProfile: true },
    });

    await this.adminLogService.createLog({
      userId: adminId,
      action: 'update',
      entity: 'User',
      entityId: updated.id,
      description: `Updated user: ${updated.email}`,
    });

    return updated;
  }

  async findByUserId(userId: number) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return {
      studentId: profile.studentId,
      user: { name: profile.user.name },
    };
  }

  // 🧠 เก็บ id ของ user ที่เพิ่ง import ล่าสุดไว้ใน memory (reset ทุกครั้ง)
  private lastImportedUserIds: number[] = [];

  async importUsers(users: ImportUserDto[], adminId: number) {
    const createdUsers: User[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const uniqueEmails = new Set<string>();

    this.lastImportedUserIds = []; // reset ทุกครั้งที่ import

    for (const user of users) {
      if (uniqueEmails.has(user.email)) {
        skipped.push({ email: user.email, reason: 'Email ซ้ำในไฟล์ Excel' });
        continue;
      }
      uniqueEmails.add(user.email);

      const exists = await this.prisma.user.findUnique({
        where: { email: user.email },
      });
      if (exists) {
        skipped.push({ email: user.email, reason: 'Email มีอยู่ในระบบแล้ว' });
        continue;
      }

      if (
        user.role === 'STUDENT' &&
        (!/^\d{8}$/.test(user.studentId || '') ||
          !user.email.endsWith('@nu.ac.th'))
      ) {
        skipped.push({
          email: user.email,
          reason: 'รหัสนิสิตหรืออีเมลไม่ถูกต้อง',
        });
        continue;
      }

      if (user.role === 'APPROVER_IN' && !user.email.endsWith('@nu.ac.th')) {
        skipped.push({
          email: user.email,
          reason: 'อีเมลต้องลงท้าย @nu.ac.th',
        });
        continue;
      }

      if (
        ['APPROVER_OUT', 'EXPERIENCE_MANAGER'].includes(user.role) &&
        (!user.password || user.password.length < 3)
      ) {
        skipped.push({
          email: user.email,
          reason: 'ต้องระบุรหัสผ่านอย่างน้อย 3 ตัว',
        });
        continue;
      }

      try {
        const hashed = user.password
          ? await argon2.hash(user.password)
          : undefined;
        const newUser = await this.prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            password: hashed,
            provider: user.provider,
            role: user.role,
            studentProfile:
              user.role === 'STUDENT'
                ? { create: { studentId: user.studentId ?? '' } }
                : undefined,
            approverProfile: ['APPROVER_IN', 'APPROVER_OUT'].includes(user.role)
              ? { create: { pin: '000000' } }
              : undefined,
            experienceManagerProfile:
              user.role === 'EXPERIENCE_MANAGER' ? { create: {} } : undefined,
          },
        });

        createdUsers.push(newUser);
        this.lastImportedUserIds.push(newUser.id);
      } catch (error) {
        skipped.push({ email: user.email, reason: 'ไม่สามารถสร้างบัญชีได้' });
      }
    }

    await this.adminLogService.createLog({
      userId: adminId,
      action: 'import',
      entity: 'User',
      description: `นำเข้าผู้ใช้ ${createdUsers.length} สำเร็จ / ${skipped.length} พลาด`,
    });

    return {
      message: 'Import completed',
      createdCount: createdUsers.length,
      skippedCount: skipped.length,
      skippedEmails: skipped,
    };
  }

  async undoLastImport(adminId: number) {
    if (this.lastImportedUserIds.length === 0) {
      throw new BadRequestException('ยังไม่มีรายการนำเข้าเพื่อ Undo');
    }

    await this.prisma.user.deleteMany({
      where: { id: { in: this.lastImportedUserIds } },
    });

    await this.adminLogService.createLog({
      userId: adminId,
      action: 'delete',
      entity: 'User',
      description: `Undo Import: ลบผู้ใช้ ${this.lastImportedUserIds.length} รายการ`,
    });

    this.lastImportedUserIds = [];
    return {
      message: 'Undo สำเร็จ',
      deletedCount: this.lastImportedUserIds.length,
    };
  }

  async findStudentProfileByStudentId(studentId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Student not found');
    return {
      studentId: profile.studentId,
      fullname: profile.user.name,
    };
  }
}
