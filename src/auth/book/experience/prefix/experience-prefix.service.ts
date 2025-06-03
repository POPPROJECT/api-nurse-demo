import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePrefixDto } from '../dto/create-prefix.dto';

@Injectable()
export class ExperienceBookPrefixService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(bookId: number) {
    // optional: เช็คก่อนว่าเล่มนี้มีอยู่จริง
    const book = await this.prisma.experienceBook.findUnique({
      where: { id: bookId },
    });
    if (!book)
      throw new NotFoundException(`ExperienceBook ${bookId} not found`);
    return this.prisma.bookPrefix.findMany({
      where: { bookId },
      select: { id: true, prefix: true },
      orderBy: { id: 'asc' },
    });
  }

  async create(bookId: number, dto: CreatePrefixDto) {
    // optional: เช็คเล่มอีกครั้ง (หรือ rely ที่ FK constraint)
    return this.prisma.bookPrefix.create({
      data: {
        bookId,
        prefix: dto.prefix,
      },
      select: { id: true, prefix: true },
    });
  }

  async remove(bookId: number, prefixId: number) {
    // optional: เช็คก่อนว่ารหัส prefix นี้มีอยู่จริงสำหรับเล่มนี้
    const existing = await this.prisma.bookPrefix.findFirst({
      where: { id: prefixId, bookId },
    });
    if (!existing)
      throw new NotFoundException(
        `Prefix ${prefixId} not found for book ${bookId}`,
      );
    await this.prisma.bookPrefix.delete({ where: { id: prefixId } });
    return { deleted: true };
  }
}
