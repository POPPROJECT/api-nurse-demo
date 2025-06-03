import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExperienceBookAuthorizedController } from './prefix/experience-authorized.controller';
import { ExperienceBookController } from './experience.controller';
import { ExperienceBookPrefixController } from './prefix/experience-prefix.controller';
import { ExperienceBookService } from './experience.service';
import { ExperienceBookPrefixService } from './prefix/experience-prefix.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminLogModule } from 'src/auth/admin/admin-log/admin-log.module';

@Module({
  imports: [AuthModule, AdminLogModule],
  controllers: [
    // ต้องลงทะเบียน Authorized ก่อน เพื่อให้ route /authorized มาทันก่อน :id
    ExperienceBookAuthorizedController,
    ExperienceBookController,
    ExperienceBookPrefixController,
  ],
  providers: [
    ExperienceBookService,
    PrismaService,
    ExperienceBookPrefixService,
  ],
  exports: [ExperienceBookPrefixService],
})
export class ExperienceBookModule {}
