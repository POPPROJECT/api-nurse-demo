import { Module } from '@nestjs/common';
import { CheckStudentService } from './check-student.service';
import { CheckStudentController } from './check-student.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [CheckStudentService, PrismaService],
  controllers: [CheckStudentController],
  exports: [CheckStudentService],
})
export class CheckStudentModule {}
