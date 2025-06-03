import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from 'src/auth/auth.module';
import { JwtOrSessionStrategy } from '../strategies/jwt-or-session.strategy';
import { AdminLogModule } from '../admin/admin-log/admin-log.module';

@Module({
  imports: [AuthModule, AdminLogModule],
  controllers: [UsersController],
  providers: [UsersService, JwtOrSessionStrategy],
})
export class UsersModule {}
