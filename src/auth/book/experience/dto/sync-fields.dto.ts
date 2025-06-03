import { FieldType } from '@prisma/client';

export class SyncFieldDto {
  id?: number; // มีเฉพาะของที่แก้ไข
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[];
}
