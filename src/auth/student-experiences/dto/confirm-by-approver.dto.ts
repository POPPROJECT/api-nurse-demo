import { IsString } from 'class-validator';

export class ConfirmByApproverDto {
  @IsString()
  approverName: string;

  @IsString()
  pin: string;
}

export class BulkConfirmByApproverDto {
  @IsString()
  approverName: string;

  @IsString()
  pin: string;

  // id a student
  @IsString({ each: true })
  ids: string[];
}
