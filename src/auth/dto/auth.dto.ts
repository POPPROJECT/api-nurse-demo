// src/auth/dto/auth.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

// register Student
export class SignUpStudentDto {
  @IsString()
  public name: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !['APPROVER_OUT', 'EXPERIENCE_MANAGER'].includes(o.role))
  @IsEmail({}, { message: 'Email must be a valid @nu.ac.th email' })
  email: string;

  @ValidateIf((o) => o.provider === 'LOCAL')
  @IsString()
  @Length(3, 20, {
    message: 'Password has to be at between 3 and 20 chars',
  })
  password?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  public role?: string;

  @IsOptional()
  @IsString()
  hospital?: string;

  @IsOptional()
  @IsString()
  ward?: string;
}

export class SignInDto {
  @IsNotEmpty()
  @IsString()
  public identifier: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 20, { message: 'Password has to be at between 3 and 20 chars' })
  public password: string;
}
