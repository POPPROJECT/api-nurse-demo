import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PendingRequestsQueryDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'course' | 'studentName' | 'subCourse' = 'createdAt';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
