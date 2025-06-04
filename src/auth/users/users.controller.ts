import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Patch,
  UseInterceptors,
  Body,
  UploadedFile,
  Delete,
  Req,
  Post,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtOrSessionGuard } from '../guards/jwt-or-session.guard';
import { UserStatus } from '@prisma/client';
import { ImportUserDto } from '../dto/import-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  // ✅ ดูเฉพาะผู้ใช้ตาม role (เช่น ?role=STUDENT)
  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN) // ต้องเป็น admin เท่านั้น
  @Get()
  getUsers(@Query('role') role?: string) {
    return this.usersService.getUsersByRole(role);
  }

  // ✅ ดึงข้อมูลตัวเองจาก token
  // @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
  @Get('me')
  async getMe(@CurrentUser() user: { id: number; role: string; name: string }) {
    const u = await this.usersService.findOne(user.id);
    return {
      id: u.id,
      fullname: u.name,
      email: u.email,
      role: u.role,
      studentId: u.studentProfile?.studentId ?? '',
      avatarUrl: u.avatarUrl ?? '',
      pin: u.approverProfile?.pin ?? '', // ✅ ดึงจาก user เต็ม
    };
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateMe(
    @CurrentUser() user: { id: number },
    @Body()
    body: {
      fullname?: string;
      studentId?: string;
      pin?: string;
      password?: string;
    },
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(user.id, body, avatar);
  }

  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('import')
  async importUsers(
    @CurrentUser() user: any,
    @Body() dto: { users: ImportUserDto[] },
  ) {
    return this.usersService.importUsers(dto.users, user.id);
  }

  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('import/undo')
  async undoLastImport(@CurrentUser() user: any) {
    return this.usersService.undoLastImport(user.id);
  }

  // เพื่อแปลง studentProfileId → userId
  @Get('by-student-id/:studentId')
  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EXPERIENCE_MANAGER)
  async getUserIdFromStudentId(@Param('studentId') studentId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('ไม่พบนิสิต');
    return { userId: profile.userId, name: profile.user.name };
  }

  // ✅ ดึง user ตาม id (ป้องกันดูข้อมูลคนอื่น)
  @Get(':id')
  getMyUser(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = parseInt(id, 10);
    if (user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.usersService.findOne(userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtOrSessionGuard)
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
  ) {
    return this.usersService.updateStatus(id, body.status);
  }

  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
  ) {
    const userId = parseInt(id, 10);
    return this.usersService.deleteUser(userId, user.id);
  }

  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  getUserByAdmin(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @UseGuards(JwtOrSessionGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body()
    body: { name?: string; email?: string; pin?: string; password?: string; studentId?: string },
    @CurrentUser() user: { id: number },
  ) {
    return this.usersService.adminUpdateUser(+id, body, user.id);
  }

  @UseGuards(JwtOrSessionGuard)
  @Get('me/profile')
  async getMyProfile(@Req() req: any) {
    return this.usersService.findByUserId(req.user.id);
  }

  @Get('student/:studentIdString') // Assuming this matches your frontend call path
  @UseGuards(JwtOrSessionGuard, RolesGuard) // <<--- เพิ่ม/ตรวจสอบบรรทัดนี้
  @Roles(Role.ADMIN, Role.EXPERIENCE_MANAGER) // <<<<------ ADD/VERIFY THIS LINE!
  async findStudentProfile(@Param('studentIdString') studentIdString: string) {
    // Your logic to find and return student profile
    // Ensure this method can be accessed by EXPERIENCE_MANAGER
    return this.usersService.findStudentProfileByStudentId(studentIdString);
  }
}
