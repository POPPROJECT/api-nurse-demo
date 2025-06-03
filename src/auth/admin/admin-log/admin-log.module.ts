import { Module } from '@nestjs/common';
import { AdminLogService } from './admin-log.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminLogController } from './admin-log.controller';

@Module({
  controllers: [AdminLogController],
  providers: [AdminLogService, PrismaService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
