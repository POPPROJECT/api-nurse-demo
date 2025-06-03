import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum RoleEnum {
  STUDENT = 'STUDENT',
  APPROVER_IN = 'APPROVER_IN',
  APPROVER_OUT = 'APPROVER_OUT',
  EXPERIENCE_MANAGER = 'EXPERIENCE_MANAGER',
}

export enum ProviderEnum {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

export class ImportUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(
    (o) =>
      o.role === RoleEnum.APPROVER_OUT ||
      o.role === RoleEnum.EXPERIENCE_MANAGER,
  )
  @Matches(/^.+$/, { message: 'username/email ห้ามว่าง' })
  email: string; // ✅ ใช้เป็น username ได้

  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsEnum(ProviderEnum)
  provider: ProviderEnum;

  @ValidateIf((o) => o.role === RoleEnum.STUDENT)
  @Length(8, 8)
  @IsOptional()
  studentId?: string;

  @ValidateIf(
    (o) =>
      o.role === RoleEnum.APPROVER_OUT ||
      o.role === RoleEnum.EXPERIENCE_MANAGER,
  )
  @IsString()
  @Length(3, 20)
  @IsOptional()
  password?: string;
}

export class ImportUserArrayDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportUserDto)
  users: ImportUserDto[];
}
