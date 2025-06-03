export class UpdateFieldDto {
  name?: string;
  label?: string;
  type?: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'TEXTAREA';
  required?: boolean;
  order?: number;
  options?: string[];
}
