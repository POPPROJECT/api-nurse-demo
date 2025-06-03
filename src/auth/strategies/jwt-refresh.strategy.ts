import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.['refresh_token'],
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET', {
        infer: true,
      }),
      passReqToCallback: true,
    });

    // ✅ สำหรับ debug (ลบออกหลัง deploy จริง)
    if (!configService.get('JWT_REFRESH_SECRET')) {
      console.error('❌ JWT_REFRESH_SECRET is not defined in env!');
    }
  }

  async validate(req: Request, payload: { sub: number }) {
    const refreshToken = req.cookies?.['refresh_token'];
    const user = await this.authService.validateRefreshToken(payload.sub, refreshToken);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
