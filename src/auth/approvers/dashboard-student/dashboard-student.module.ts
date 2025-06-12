import { Module } from '@nestjs/common';
import {
  DashboardController,
  DashboardSubjectController,
} from './dashboard-student.controller';
import {
  DashboardService,
  DashboardSubjectService,
} from './dashboard-student.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [DashboardController, DashboardSubjectController],
  providers: [DashboardService, DashboardSubjectService, PrismaService],
})
export class DashboardModule {}
