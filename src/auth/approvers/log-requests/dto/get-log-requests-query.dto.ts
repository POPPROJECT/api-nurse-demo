import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExperienceStatus } from '@prisma/client';

export class GetLogRequestsQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) limit = 10;

  @IsOptional() @IsString() search?: string;

  @IsOptional()
  @IsIn(['studentId', 'name', 'course', 'subCourse', 'createdAt'])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';

  @IsOptional() @IsIn(['all', 'confirmed', 'cancel']) status:
    | 'all'
    | 'confirmed'
    | 'cancel' = 'all';

  // ถ้าต้องการ filter ช่วงวันที่
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}
