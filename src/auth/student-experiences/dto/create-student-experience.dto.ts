import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FieldValueDto {
  @IsInt()
  fieldId: number;

  @IsString()
  value: string;
}

export class CreateStudentExperienceDto {
  @IsInt()
  bookId: number;

  @IsString()
  approverRole: string;

  @IsString()
  approverName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  fieldValues: FieldValueDto[];

  @IsOptional()
  @IsString()
  course?: string;

  @IsInt()
  @Type(() => Number)
  subCourseId: number; // ✅ ใช้เพื่อ lookup ค่า subject / alwaycourse

  @IsOptional()
  @IsString()
  subCourse?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  alwaycourse?: number;
}
