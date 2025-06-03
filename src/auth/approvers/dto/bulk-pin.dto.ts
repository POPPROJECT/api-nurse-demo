import { PinDto } from './pin.dto';
import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkPinDto extends PinDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @Type(() => String)
  ids: string[];
}
