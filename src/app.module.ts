import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './auth/users/users.module';
import { ApproversModule } from './auth/approvers/approvers.module';
import { ExperienceBookModule } from './auth/book/experience/experience.module';
import { CourseModule } from './auth/book/course/course.module';
import { SubCourseModule } from './auth/book/subcourse/subcourse.module';
import { PrismaService } from './prisma/prisma.service';
import { StudentExperiencesService } from './auth/student-experiences/student-experiences.service';
import { ApproversService } from './auth/approvers/approvers.service';
import { StudentExperiencesController } from './auth/student-experiences/student-experiences.controller';
import { ApproversController } from './auth/approvers/approvers.controller';
import { StudentExperiencesModule } from './auth/student-experiences/student-experiences.module';
import { DashboardModule } from './auth/approvers/dashboard-student/dashboard-student.module';
import { AdminLogModule } from './auth/admin/admin-log/admin-log.module';
import { AdminSettingModule } from './auth/admin/admin-setting/admin-setting.module';
import { JwtOrSessionStrategy } from './auth/strategies/jwt-or-session.strategy';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './auth/config/jwt.config';
import refreshJwtConfig from './auth/config/refresh-jwt.config';
import googleOauthConfig from './auth/config/google-oauth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, refreshJwtConfig, googleOauthConfig],
    }),
    AuthModule,
    PrismaModule,
    UsersModule,
    ApproversModule,
    ExperienceBookModule,
    CourseModule,
    SubCourseModule,
    StudentExperiencesModule,
    DashboardModule,
    AdminLogModule,
    AdminSettingModule,
  ],
  controllers: [
    AppController,
    StudentExperiencesController,
    ApproversController,
  ],
  providers: [
    AppService,
    PrismaService,
    StudentExperiencesService,
    ApproversService,
    JwtOrSessionStrategy,
  ],
})
export class AppModule {}
