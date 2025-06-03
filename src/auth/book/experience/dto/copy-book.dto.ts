import { IsString, IsNotEmpty } from 'class-validator';

export class CopyBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
