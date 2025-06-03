// jwt-or-session.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken'; // ✅ 1. Import 'jsonwebtoken'

@Injectable()
export class JwtOrSessionStrategy extends PassportStrategy(
  Strategy,
  'jwt-or-session',
) {
  constructor(private config: ConfigService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.access_token;

    if (!token) throw new UnauthorizedException('No token provided');

    const jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');

    try {
      // ✅ 2. เปลี่ยนมาใช้ jwt.verify แทน jose
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

      // ✅ 3. สร้าง object user จาก payload ที่ได้
      const user = {
        id: Number(payload.sub),
        name: payload.name,
        role: payload.role,
      };

      req.user = user;
      return user;
    } catch (err) {
      // jwt.verify จะโยน error เองถ้า token ไม่ถูกต้อง (เช่น หมดอายุ, signature ผิด)
      throw new UnauthorizedException('Invalid token: ' + err.message);
    }
  }
}
