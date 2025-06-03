import { IsInt, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortByColumn {
  studentId = 'studentId',
  name = 'name', // ← เพิ่มเข้าไปแล้ว
  percent = 'percent',
}

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class GetCheckStudentsQueryDto {
  @Type(() => Number)
  @IsInt()
  bookId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit = 10;

  @IsString()
  @IsOptional()
  search = '';

  /** เปลี่ยนจาก @IsIn มาใช้ @IsEnum เพื่อรองรับชื่อคอลัมน์ได้ครบ */
  @IsEnum(SortByColumn, {
    message: `sortBy must be one of: ${Object.values(SortByColumn).join(', ')}`,
  })
  @IsOptional()
  sortBy: SortByColumn = SortByColumn.studentId;

  /** เปลี่ยนจาก @IsIn มาใช้ @IsEnum */
  @IsEnum(SortOrder, {
    message: `order must be either 'asc' or 'desc'`,
  })
  @IsOptional()
  order: SortOrder = SortOrder.asc;
}
