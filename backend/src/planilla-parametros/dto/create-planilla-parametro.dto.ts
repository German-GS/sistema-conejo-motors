// backend/src/planilla-parametros/dto/create-planilla-parametro.dto.ts
import { IsNumber } from 'class-validator';

export class CreatePlanillaParametroDto {
  @IsNumber()
  valor: number;
}
