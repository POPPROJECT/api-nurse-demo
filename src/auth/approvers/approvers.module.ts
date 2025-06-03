import { Module } from '@nestjs/common';
import { ApproversService } from './approvers.service';
import { ApproversController } from './approvers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CheckStudentModule } from './check-student/check-student.module';
import { LogRequestsModule } from './log-requests/log-requests.module';
import { LogRequestsService } from './log-requests/log-requests.service';
import { CheckStudentService } from './check-student/check-student.service';
import { RequestsService } from './requests/requests.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CheckStudentController } from './check-student/check-student.controller';
import { LogRequestsController } from './log-requests/log-requests.controller';
import { RequestsController } from './requests/requests.controller';
import { DashboardModule } from './dashboard-student/dashboard-student.module';

@Module({
  controllers: [
    ApproversController,
    RequestsController,
    LogRequestsController,
    CheckStudentController,
  ],
  providers: [
    ApproversService,
    PrismaService,
    LogRequestsService,
    RequestsService,
    CheckStudentService,
  ],
  imports: [LogRequestsModule, CheckStudentModule, DashboardModule],
  // ถ้าต้องการให้ service นี้ถูกใช้จาก module อื่น ให้ export ด้วย
  exports: [LogRequestsService],
})
export class ApproversModule {}
