import {
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client'; // 👈 [ปรับปรุง] import Enum เพื่อการ validation ที่ดีขึ้น

class FieldValueDto {
  @IsInt()
  fieldId: number;

  @IsString()
  value: string;
}

export class CreateStudentExperienceDto {
  @IsInt()
  bookId: number;

  // [ปรับปรุง] ใช้ IsEnum เพื่อให้แน่ใจว่าค่าที่ส่งมาถูกต้องตาม Role ใน schema
  @IsEnum(Role)
  approverRole: Role;

  @IsString()
  approverName: string;

  @IsInt()
  @Type(() => Number)
  subCourseId: number; // ✅ Backend ต้องการฟิลด์นี้เพื่อหา courseId และข้อมูลอื่นๆ

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  fieldValues: FieldValueDto[];

  // ❌ ฟิลด์ course, subCourse, subject, alwaycourse ถูกลบออก
  // เพราะ service จะดึงข้อมูลเหล่านี้จาก subCourseId ที่ส่งมาโดยอัตโนมัติ
  // และไม่มีการเก็บค่าเหล่านี้โดยตรงในตาราง StudentExperience ตาม schema
}
