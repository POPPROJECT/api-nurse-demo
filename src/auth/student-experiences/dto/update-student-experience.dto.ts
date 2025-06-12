import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FieldValueUpdateDto {
  @IsNumber()
  fieldId: number;

  @IsString()
  value: string;
}

export class UpdateStudentExperienceDto {
  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  subCourse?: string;

  @IsOptional()
  @IsString()
  approverName?: string;

  // ▼▼▼ [แก้ไข] จุดสำคัญคือตรงนี้ เปลี่ยนเป็น IsString และ string ▼▼▼
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  alwaycourse?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueUpdateDto)
  fieldValues?: FieldValueUpdateDto[];
}
