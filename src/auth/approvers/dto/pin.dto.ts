import { IsString, Length, Matches } from 'class-validator';

export class PinDto {
  @IsString()
  @Length(6, 6, { message: 'PIN ต้องเป็นตัวเลข 6 หลัก' })
  @Matches(/^\d{6}$/, { message: 'PIN ต้องเป็นตัวเลขเท่านั้น' })
  pin: string;
}
