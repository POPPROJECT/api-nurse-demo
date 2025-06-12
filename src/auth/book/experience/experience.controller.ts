import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SyncFieldDto } from './dto/sync-fields.dto';
import { ExperienceBookService } from './experience.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';
import { CopyBookDto } from './dto/copy-book.dto';

@UseGuards(JwtOrSessionGuard)
@Controller('experience-books')
export class ExperienceBookController {
  constructor(
    private readonly svc: ExperienceBookService,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────────────────────────────────────
  // BOOK
  // ──────────────────────────────────────────────

  @Post()
  createBook(@Body() dto: CreateBookDto) {
    return this.svc.createBook(dto);
  }

  @Get()
  listBooks() {
    return this.svc.listBooks();
  }

  @Get('details')
  getBooksWithCounts() {
    return this.svc.getBooksWithCounts();
  }

  @Patch('set-required-counts')
  updateRequiredCounts(@Body() body: any) {
    return this.svc.updateRequiredCounts(body);
  }

  // ──────────────────────────────────────────────
  // FIELDS
  // ──────────────────────────────────────────────

  @HttpCode(200)
  @Post(':bookId/fields')
  upsertFields(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body('fields') fields: CreateFieldDto[],
  ) {
    return this.svc.bulkReplaceFields(bookId, fields);
  }

  @Get(':bookId/fields')
  listFields(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.svc.listFields(bookId);
  }

  @Patch('fields/:id')
  updateField(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.svc.updateField(id, dto);
  }

  @Delete('fields/:id')
  deleteField(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteField(id);
  }

  @Post(':bookId/fields/sync')
  syncFields(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: SyncFieldDto[],
  ) {
    return this.svc.syncFields(bookId, dto);
  }

  // ──────────────────────────────────────────────
  // STUDENT PROGRESS (mapped from userId)
  // ──────────────────────────────────────────────

  @Get(':bookId/progress/user/:userId')
  async getStudentProgressFromUser(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student)
      throw new NotFoundException(`ไม่พบ studentProfile จาก userId=${userId}`);
    return this.svc.getStudentProgress(bookId, student.id);
  }

  @Patch(':bookId/progress/user/:userId')
  async setStudentProgressFromUser(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { progress: { subCourseId: number; count: number }[] },
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student)
      throw new NotFoundException(`ไม่พบ studentProfile จาก userId=${userId}`);
    return this.svc.setStudentProgress(bookId, student.id, body.progress);
  }

  // ดึง progress ของนิสิตไปแสดง โดยแปลงไอดีเป็นรหัสนิสิตไปแสดง
  @Get(':bookId/progress/user-by-string-id/:studentIdString')
  async getStudentProgressByStudentStringId(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('studentIdString') studentIdString: string, // <-- รับเป็น string
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { studentId: studentIdString }, // <-- ค้นหาด้วย field 'studentId' (รหัสนิสิต string)
    });
    if (!student) {
      throw new NotFoundException(
        `ไม่พบ studentProfile จากรหัสนิสิต (string ID) = ${studentIdString}`,
      );
    }
    return this.svc.getStudentProgress(bookId, student.id);
  }

  // อัปเดทตัวประสบการณ์ (check-list)
  @Patch(':bookId/progress/user-by-string-id/:studentIdString')
  async setStudentProgressByStudentStringId(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('studentIdString') studentIdString: string, // <-- รับเป็น string
    @Body() body: { progress: { subCourseId: number; count: number }[] },
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { studentId: studentIdString }, // <-- ค้นหาด้วย field 'studentId' (รหัสนิสิต string)
    });
    if (!student) {
      throw new NotFoundException(
        `ไม่พบ studentProfile จากรหัสนิสิต (string ID) = ${studentIdString}`,
      );
    }
    return this.svc.setStudentProgress(bookId, student.id, body.progress);
  }

  // ──────────────────────────────────────────────
  // LAST: Get/Update/Delete book by id
  // ──────────────────────────────────────────────

  @Get(':id')
  getBook(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getBook(id);
  }

  @Patch(':id')
  updateBook(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
  ) {
    return this.svc.updateBook(id, dto);
  }

  @Delete(':id')
  deleteBook(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteBook(id);
  }

  @Post(':id/copy')
  @HttpCode(201)
  copyBook(@Param('id', ParseIntPipe) id: number, @Body() dto: CopyBookDto) {
    return this.svc.copyBook(id, dto);
  }

  // ──────────────────────────────────────────────
  // dashboard
  // ──────────────────────────────────────────────

  // dashboard-subject
  @Get(':id/courses')
  findCoursesByBook(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findCoursesByBookId(id);
  }

  // ▼▼▼ [เพิ่ม] Endpoint ใหม่สำหรับดึงรายชื่อ Subject ▼▼▼
  @Get(':id/subjects')
  findSubjectsByBook(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findSubjectsByBookId(id);
  }
  // ▲▲▲ [สิ้นสุดส่วนที่เพิ่ม] ▲▲▲
}
