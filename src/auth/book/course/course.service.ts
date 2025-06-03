import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  list(bookId: number) {
    return this.prisma.course.findMany({ where: { bookId } });
  }

  create(bookId: number, name: string) {
    return this.prisma.course.create({ data: { bookId, name } });
  }

  update(id: number, name: string) {
    return this.prisma.course.update({ where: { id }, data: { name } });
  }

  remove(id: number) {
    return this.prisma.course.delete({ where: { id } });
  }
}
