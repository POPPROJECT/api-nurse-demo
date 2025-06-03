import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtOrSessionGuard } from './jwt-or-session.guard';

export const GlobalGuards = [
  // {
  //   provide: APP_GUARD,
  //   useClass: JwtAuthGuard,
  // },
  {
    provide: APP_GUARD,
    useClass: JwtOrSessionGuard
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
];
