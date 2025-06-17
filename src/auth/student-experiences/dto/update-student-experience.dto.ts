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
  approverName?: string; // ✅ สามารถแก้ไขได้

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueUpdateDto)
  fieldValues?: FieldValueUpdateDto[]; // ✅ สามารถแก้ไขได้

  // ❌ ฟิลด์ course, subCourse, subject, alwaycourse ถูกลบออก
  // เพราะ service ที่แก้ไขล่าสุดไม่รองรับการแก้ไขฟิลด์เหล่านี้โดยตรง
  // (การเปลี่ยน course/subcourse เป็น operation ที่ซับซ้อนและควรใช้ ID)
}
