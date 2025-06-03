import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { CreateStudentExperienceDto } from './dto/create-student-experience.dto';
import { StudentExperiencesService } from './student-experiences.service';
import { JwtOrSessionGuard } from '../guards/jwt-or-session.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UpdateStudentExperienceDto } from './dto/update-student-experience.dto';
import {
  BulkConfirmByApproverDto,
  ConfirmByApproverDto,
} from './dto/confirm-by-approver.dto';

@UseGuards(JwtOrSessionGuard)
@Controller('student-experiences')
export class StudentExperiencesController {
  constructor(private readonly svc: StudentExperiencesService) {}

  // 1. สร้างรายการใหม่
  @Post()
  async create(
    @Body() dto: CreateStudentExperienceDto,
    @CurrentUser() user: { id: number },
  ) {
    try {
      return await this.svc.create(dto, user.id);
    } catch (e) {
      console.error(e); // ✅ ดู error แท้จริง
      throw e;
    }
  }

  // 2. ดึงรายการของนิสิต (self-only)
  @Get()
  list(
    @CurrentUser() user: { id: number },
    @Query('bookId', ParseIntPipe) bookId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
    @Query('status') status: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL' = 'ALL',
    @Query('sortBy') sortBy: 'createdAt' | 'course' | 'status' = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    return this.svc.findAllOfStudent(user.id, {
      bookId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      status,
      sortBy,
      order,
    });
  }

  // ดึงประวัติของนิสิตตาม studentId (admin/manager ใช้ดู)
  @Get('/admin')
  getByStudentId(
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('bookId', ParseIntPipe) bookId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
    @Query('status') status: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCEL' = 'ALL',
    @Query('sortBy') sortBy: 'createdAt' | 'course' | 'status' = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    return this.svc.findByStudentId({
      studentId,
      bookId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      status,
      sortBy,
      order,
    });
  }

  // 3. ดึงรายละเอียดของนิสิตเจ้าของรายการ
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.svc.findOneOfStudent(id, user.id);
  }

  // 4. ผู้ตรวจ confirm (ต้อง PIN)
  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
    @Body('pin') pin: string,
  ) {
    return this.svc.confirm(id, user.id, pin);
  }

  // นิสิตส่งมือถือให้ approver กรอก PIN ยืนยัน
  @Post(':id/confirm-by-approver')
  @HttpCode(200)
  confirmByApprover(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
    @Body() dto: ConfirmByApproverDto,
  ) {
    return this.svc.confirmByApprover(id, user.id, dto.approverName, dto.pin);
  }

  // bulk confirm โดย approver name + PIN
  @Post('bulk-confirm-by-approver')
  @HttpCode(200)
  confirmBulkApprover(
    @CurrentUser() user: { id: number },
    @Body() dto: BulkConfirmByApproverDto,
  ) {
    return this.svc.confirmBulkByApprover(
      user.id,
      dto.approverName,
      dto.ids,
      dto.pin,
    );
  }

  // 5. ผู้ตรวจ reject (ต้อง PIN)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
    @Body('pin') pin: string,
  ) {
    return this.svc.reject(id, user.id, pin);
  }

  // 6. นิสิตยกเลิกเอง (ไม่ต้อง PIN)
  @Patch(':id/cancel')
  @HttpCode(200)
  cancelOwn(@Param('id') id: string, @CurrentUser() user: { id: number }) {
    return this.svc.cancelOwn(id, user.id);
  }

  // 7. ลบของตัวเอง (หลัง cancel แล้ว)
  @Delete(':id')
  @HttpCode(204)
  async deleteOwn(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
  ) {
    await this.svc.deleteOwn(id, user.id);
  }

  // 8. แก้ไขเองได้เฉพาะ PENDING
  @Patch(':id')
  @HttpCode(200)
  updateOwn(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateStudentExperienceDto,
  ) {
    return this.svc.updateOwn(id, user.id, dto);
  }

  @Delete('admin/:id')
  @HttpCode(204)
  adminDelete(@Param('id') id: string) {
    return this.svc.adminDelete(id);
  }
}
