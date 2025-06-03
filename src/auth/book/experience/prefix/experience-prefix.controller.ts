import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CreatePrefixDto } from '../dto/create-prefix.dto';
import { ExperienceBookPrefixService } from './experience-prefix.service';
import { JwtOrSessionGuard } from 'src/auth/guards/jwt-or-session.guard';

// ✅ ใช้ JwtAuthGuard ป้องกัน route นี้ (ต้อง login)
// @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
// ✅ ลบ (\d+) ออก เพราะไม่รองรับอีกต่อไปใน path-to-regexp
@Controller('experience-books/:bookId/prefixes')
export class ExperienceBookPrefixController {
  constructor(private readonly prefixService: ExperienceBookPrefixService) {}

  /** 📘 ดึงรายการ prefix ทั้งหมดในเล่มนั้น */
  @Get()
  getAll(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.prefixService.findAll(bookId);
  }

  /** ➕ เพิ่ม prefix ให้กับสมุด */
  @Post()
  create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: CreatePrefixDto,
  ) {
    return this.prefixService.create(bookId, dto);
  }

  /** ❌ ลบ prefix ตาม id */
  @Delete(':prefixId')
  remove(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('prefixId', ParseIntPipe) prefixId: number,
  ) {
    return this.prefixService.remove(bookId, prefixId);
  }
}
