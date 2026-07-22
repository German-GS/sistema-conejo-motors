// backend/src/salarios/dto/create-salario.dto.ts
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber } from 'class-validator';

export class CreateSalarioDto {
  @IsNumber()
  salario_base: number;

  @Type(() => Date)
  @IsDate()
  fecha_efectiva: Date;

  @IsInt()
  usuarioId: number;
}
