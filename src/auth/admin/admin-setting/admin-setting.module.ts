import { Module } from '@nestjs/common';
import { AdminSettingService } from './admin-setting.service';
import { AdminSettingController } from './admin-setting.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminSettingController],
  providers: [AdminSettingService, PrismaService],
  exports: [AdminSettingService],
})
export class AdminSettingModule {}
