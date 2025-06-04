import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpStudentDto } from './dto/auth.dto';
import { UsersService } from 'src/auth/users/users.service';
import { AuthJwtPayload } from 'types/auth-jwtPayload';
import jwtConfig from './config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import { Role, Provider } from '@prisma/client';
import { UserStatus } from './enums/user-status.enum';
import { AdminLogService } from './admin/admin-log/admin-log.service';
import { User } from '@prisma/client';
import refreshJwtConfig from './config/refresh-jwt.config';

interface GoogleUser {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string; // หรือ Role type ของคุณ
  provider: string; // หรือ Provider type ของคุณ
  status: string; // หรือ UserStatus type ของคุณ
}

interface GoogleRequest extends Request {
  user: GoogleUser;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private userService: UsersService,
    @Inject(jwtConfig.KEY)
    private jwtConf: ConfigType<typeof jwtConfig>,
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConf: ConfigType<typeof refreshJwtConfig>,
    private adminLogService: AdminLogService,
  ) {}

  // ✅ Signin (Local)
  async signin(dto: SignInDto) {
    const { identifier, password } = dto;
    const isEmail = identifier.includes('@');

    let user:
      | (User & {
          studentProfile?: { studentId: string | null } | null;
          approverProfile?: { pin: string | null } | null;
        })
      | null = null;

    // 🔍 ค้นหาผู้ใช้ตาม identifier
    if (isEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: identifier },
      });
    } else {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier }, // ✅ username ที่เก็บไว้ใน email field
            { studentProfile: { studentId: identifier } },
            { approverProfile: { pin: identifier } },
          ],
        },
        include: {
          studentProfile: true,
          approverProfile: true,
        },
      });
    }

    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้ในระบบ');
    }

    // 🚫 ตรวจสอบสถานะ
    if (user.status === UserStatus.DISABLE) {
      throw new ForbiddenException(
        'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    // 🔐 เฉพาะ LOCAL เท่านั้นที่ใช้รหัสผ่าน
    if (!user.password || user.provider !== Provider.LOCAL) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบด้วย Google');
    }

    // 🔒 ตรวจรหัสผ่าน
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
    }

    // 🎫 สร้าง access/refresh token
    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      name: user.name,
      role: user.role,
    });

    // 💾 เก็บ refresh token แบบเข้ารหัส
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.updateHashedRefreshToken(user.id, hashedRefreshToken);

    return {
      message: 'Logged in successfully',
      id: user.id,
      name: user.name,
      role: user.role,
      accessToken,
      refreshToken,
    };
  }

  // ✅ SignUp
  async signup(dto: SignUpStudentDto) {
    const { name, email, password, studentId, role, provider, hospital, ward } =
      dto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ForbiddenException('Email already registered');

    const finalProvider: Provider =
      provider === 'GOOGLE' ? Provider.GOOGLE : Provider.LOCAL;
    const allRoles: Role[] = [
      'ADMIN',
      'APPROVER_IN',
      'APPROVER_OUT',
      'EXPERIENCE_MANAGER',
      'STUDENT',
    ];
    const finalRole: Role = allRoles.includes(role as Role)
      ? (role as Role)
      : Role.STUDENT;

    // ✅ รวม hospital + ward เป็น name หากเป็น APPROVER_OUT
    const finalName =
      role === 'APPROVER_OUT' && hospital && ward
        ? `${hospital} - ${ward}`
        : name;

    let hashedPassword: string | undefined = undefined;
    if (finalProvider === Provider.LOCAL) {
      if (!password)
        throw new BadRequestException('Password is required for LOCAL users');
      hashedPassword = await argon2.hash(password);
    }

    const createdUser = await this.prisma.user.create({
      data: {
        name: finalName,
        email,
        password: hashedPassword,
        provider: finalProvider,
        role: finalRole,
        studentProfile:
          finalRole === 'STUDENT'
            ? {
                create: {
                  studentId: studentId || undefined,
                },
              }
            : undefined,
        approverProfile:
          finalRole === Role.APPROVER_IN || finalRole === Role.APPROVER_OUT
            ? {
                create: {
                  pin: '000000', // หรือ generate PIN เริ่มต้นให้ user แก้ในภายหลัง
                },
              }
            : undefined,
      },
    });

    try {
      const adminUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { id: 'asc' }, // หรือใช้ userId จาก context ถ้ามี
      });

      if (adminUser) {
        await this.adminLogService.createLog({
          userId: adminUser.id,
          action: 'create',
          entity: 'User',
          entityId: createdUser.id,
          description: `สร้างบัญชีผู้ใช้ชื่อ "${createdUser.name}" (${createdUser.email})`,
        });
      }
    } catch (err) {
      console.error('❌ Failed to log user creation:', err.message);
    }

    return { message: 'Signup successful' };
  }

  // ✅ Generate Access/Refresh Token
  async generateTokens(user: { id: number; name: string; role: Role }) {
    const payload: AuthJwtPayload = {
      sub: user.id.toString(), // JWT spec expects string
      name: user.name,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.jwtConf.secret,
        expiresIn: this.jwtConf.expiresIn,
      }),
      this.jwt.signAsync(payload, {
        secret: this.refreshTokenConf.secret,
        expiresIn: this.refreshTokenConf.expiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ✅ Update refresh token
  async updateHashedRefreshToken(userId: number, hashedToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashedToken },
    });
  }

  // ✅ Logout
  async signout(userId: number) {
    await this.updateHashedRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  // ✅ Validate user (JWT)
  async validateJwtUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  // ✅ Validate user สำหรับ LocalStrategy (ใช้กับ passport-local)
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.password || user.provider !== Provider.LOCAL) {
      throw new UnauthorizedException('Please log in with Google');
    }

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) throw new UnauthorizedException('Invalid password');

    // ลบ password ออกก่อน return เพื่อความปลอดภัย
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // ✅ Validate refresh token
  async validateRefreshToken(userId: number, refreshToken: string) {
    const user = await this.userService.findOne(userId);
    if (!user?.hashedRefreshToken)
      throw new UnauthorizedException('No valid refresh token found');

    const isValid = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!isValid) throw new UnauthorizedException('Refresh token mismatch');

    return { id: user.id, role: user.role };
  }

  // ✅ Refresh Access/Refresh
  async refreshToken(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const { accessToken, refreshToken } = await this.generateTokens(user);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.updateHashedRefreshToken(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  // ✅ Google login handler
  async googleLogin(req, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL}/auth-failed`);
      return;
    }

    const tokens = await this.generateTokens(user);
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge,
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/api/auth/google/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}&` +
        `userId=${user.id}&` +
        `name=${encodeURIComponent(user.name)}&` +
        `role=${user.role}`,
    );
  }

  async validateGoogleUser(profile: {
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    if (!profile.email.endsWith('@nu.ac.th')) {
      throw new UnauthorizedException(
        'เฉพาะอีเมลของ @nu.ac.th เท่านั้นที่สามารถเข้าสู่ระบบได้',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user) {
      // ถ้ามี user อยู่แล้ว
      if (user.provider !== Provider.GOOGLE) {
        throw new UnauthorizedException(
          'This email is already registered via another method',
        );
      }
      if (user.status === UserStatus.DISABLE) {
        throw new ForbiddenException(
          'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
        );
      }
      // อัปเดตข้อมูลถ้าจำเป็น เช่น avatarUrl
      if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
        user = await this.prisma.user.update({
          where: { email: profile.email },
          data: { avatarUrl: profile.avatarUrl },
        });
      }
    } else {
      throw new UnauthorizedException(
        'บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      );
    }
    return user;
  }

  // ✅ แก้ไข Method นี้
  async handleGoogleLoginAndRedirect(
    req: Request & { user?: any }, // เพิ่ม ? ให้ user และระบุ type กว้างๆ หรือ type ที่ถูกต้องจาก Guard
    res: Response,
  ): Promise<void> {
    const userFromGoogle = req.user;

    if (!userFromGoogle || !userFromGoogle.id || !userFromGoogle.role) {
      console.error(
        'Google login (AuthService): User object or essential properties not found in request after guard.',
        userFromGoogle,
      );
      // Redirect กลับไปหน้า Frontend พร้อม Error ที่ชัดเจน
      res.redirect(
        `${process.env.FRONTEND_URL}/?error=GoogleAuthenticationFailed`,
      );
      return;
    }

    // 1. สร้าง Access Token และ Refresh Token
    // ตรวจสอบให้แน่ใจว่า userFromGoogle.role เป็นค่า enum Role ที่ถูกต้อง
    const roleEnum = userFromGoogle.role as Role;
    const tokens = await this.generateTokens({
      id: userFromGoogle.id,
      name: userFromGoogle.name, // ตรวจสอบว่ามี name ใน userFromGoogle object
      role: roleEnum,
    });

    // 2. สร้าง URL สำหรับ Redirect กลับไปยัง Frontend API Route
    // พร้อมแนบ Tokens และ Role ไปกับ Query Parameters
    const frontendCallbackUrl = `${process.env.FRONTEND_URL}/api/auth/google/callback`;
    const redirectUrl = new URL(frontendCallbackUrl);

    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    redirectUrl.searchParams.set('role', roleEnum); // ส่ง Role ที่เป็น enum ไป

    // อาจจะส่งข้อมูล user อื่นๆ กลับไปด้วยถ้าจำเป็น
    // redirectUrl.searchParams.set('userId', userFromGoogle.id.toString());
    // redirectUrl.searchParams.set('name', encodeURIComponent(userFromGoogle.name || ''));

    // 3. สั่งให้ Browser Redirect (Backend จะไม่ตั้ง Cookie เอง)
    res.redirect(redirectUrl.toString());
  }

  // ✅ Update studentId
  async updateStudentId(userId: number, studentId: string) {
    return this.prisma.studentProfile.update({
      where: { userId },
      data: { studentId },
    });
  }
}
