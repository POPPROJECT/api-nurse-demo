import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth.service';
import RefreshJwtConfig from '../config/่refresh-jwt.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(RefreshJwtConfig.KEY)
    private config: ConfigType<typeof RefreshJwtConfig>,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.['refresh_token'],
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'), // ✅ ดึงตรงจาก .env
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: number }) {
    const refreshToken = req.cookies?.['refresh_token'];
    const user = await this.authService.validateRefreshToken(
      payload.sub,
      refreshToken,
    );
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
