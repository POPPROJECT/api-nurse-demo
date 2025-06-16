import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard-student.controller';
import { DashboardService } from './dashboard-student.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
})
export class DashboardModule {}
