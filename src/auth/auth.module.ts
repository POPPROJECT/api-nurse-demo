import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from 'src/auth/users/users.service';
import { LocalStrategy } from './strategies/local.strategy';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GlobalGuards } from './guards/global.guard';
import { StudentExperiencesModule } from './student-experiences/student-experiences.module';
import { JwtOrSessionGuard } from './guards/jwt-or-session.guard';
import { JwtOrSessionStrategy } from './strategies/jwt-or-session.strategy';
import { AdminLogModule } from './admin/admin-log/admin-log.module';
import { AdminSettingModule } from './admin/admin-setting/admin-setting.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [jwtConfig.KEY],
      useFactory: (jwtConf: ReturnType<typeof jwtConfig>) => ({
        secret: jwtConf.secret,
        signOptions: {
          expiresIn: jwtConf.expiresIn,
        },
      }),
    }),
    PassportModule,
    StudentExperiencesModule,
    AdminLogModule,
    AdminSettingModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    LocalStrategy,
    JwtOrSessionStrategy,
    JwtOrSessionGuard,
    JwtRefreshStrategy,
    GoogleStrategy,
    ...GlobalGuards,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
