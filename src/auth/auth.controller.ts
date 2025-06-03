import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpStudentDto } from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { Request, Response } from 'express';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtOrSessionGuard } from './guards/jwt-or-session.guard';

interface JwtPayloadWithRole {
  sub: number;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignUpStudentDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signin(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signin(dto);

    // ✅ เซ็ต access_token (ใช้ cookie 'access_token')
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ เซ็ต refresh_token (แยก path เพื่อ refresh เฉพาะตอน POST /refresh-token)
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh-token',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      user: {
        id: result.id,
        name: result.name,
        role: result.role,
      },
    };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signout(@CurrentUser() user: JwtPayloadWithRole, @Res() res: Response) {
    await this.authService.signout(user.sub);
    res.clearCookie('refresh_token');
    return res.send({ message: 'Logged out successfully' });
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
  @Get('me')
  getProfile(@CurrentUser() user: JwtPayloadWithRole) {
    return user;
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const user = req.user as JwtPayloadWithRole;
    const tokens = await this.authService.refreshToken(user.sub);

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/refresh-token',
    });

    return res.send({ accessToken: tokens.accessToken });
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(JwtOrSessionGuard)
  @Patch('me/student-id')
  async updateStudentId(
    @CurrentUser() user: JwtPayloadWithRole,
    @Body('studentId') studentId: string,
  ) {
    return this.authService.updateStudentId(user.sub, studentId);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {
    return { msg: 'Redirecting to Google...' };
  }

  @Public()
  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleRedirect(@Req() req: Request, @Res() res: Response) {
    await this.authService.googleLogin(req, res);
  }
}
