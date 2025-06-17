import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    // private configService: ConfigService, // ไม่ต้องใช้ ConfigService แล้ว
    private authService: AuthService,
  ) {
    // ❌ จากเดิมที่ใช้ configService
    // secretOrKey: configService.get<string>('refreshJwt.secret'),

    // ✅ ลองอ่านจาก process.env โดยตรง
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.['refresh_token'],
      ]),
      secretOrKey: process.env.JWT_REFRESH_SECRET,
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
