import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtOrSessionStrategy extends PassportStrategy(
  Strategy,
  'jwt-or-session',
) {
  constructor(private config: ConfigService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    // ✅ 1. รับ token จาก Authorization header หรือ cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.access_token;

    if (!token) throw new UnauthorizedException('No token provided');

    // ✅ 2. ต้องใช้ JWT_SECRET (ไม่ใช่ SESSION_SECRET_KEY)
    const jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');

    try {
      const { jwtVerify } = await Function('return import("jose")')();

      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(jwtSecret),
        {
          algorithms: ['HS256'],
        },
      );
      req.user = {
        id: Number(payload.sub),
        name: payload.name,
        role: payload.role,
      };

      return req.user;
    } catch (err) {
      throw new UnauthorizedException('Invalid token: ' + err.message);
    }
  }
}
