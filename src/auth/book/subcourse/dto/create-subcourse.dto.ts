import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubCourseDto {
  courseId: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // ▼▼▼ [แก้ไข] เปลี่ยนจาก IsInt และ number เป็น IsString และ string ▼▼▼
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  alwaycourse?: number;
}
