import { Module } from '@nestjs/common';
import { LogRequestsService } from './log-requests.service';
import { LogRequestsController } from './log-requests.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [LogRequestsController],
  providers: [LogRequestsService, PrismaService],
})
export class LogRequestsModule {}
