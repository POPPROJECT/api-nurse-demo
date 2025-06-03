import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StudentExperiencesController } from './student-experiences.controller';
import { StudentExperiencesService } from './student-experiences.service';

@Module({
  controllers: [StudentExperiencesController],
  providers: [StudentExperiencesService, PrismaService],
})
export class StudentExperiencesModule {}
