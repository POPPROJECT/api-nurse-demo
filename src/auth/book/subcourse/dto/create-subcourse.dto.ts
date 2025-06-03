import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class CreateSubCourseDto {
  courseId: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  subject?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  alwaycourse?: number;
}
