import { PartialType } from '@nestjs/mapped-types';
import { CreateSubCourseDto } from './create-subcourse.dto';

export class UpdateSubCourseDto extends PartialType(CreateSubCourseDto) {}
