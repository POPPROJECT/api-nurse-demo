import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subject?: number;

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
