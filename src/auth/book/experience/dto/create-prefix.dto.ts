import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrefixDto {
  @IsString()
  @IsNotEmpty()
  prefix: string;
}
