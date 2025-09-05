import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanillaParametroDto } from './create-planilla-parametro.dto';

export class UpdatePlanillaParametroDto extends PartialType(CreatePlanillaParametroDto) {}
