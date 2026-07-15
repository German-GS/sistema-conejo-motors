import { PartialType } from '@nestjs/mapped-types';
import { CreateGastoDto } from './create-gasto.dto';

/** Edición de gasto: todos los campos opcionales (mismo payload que el alta). */
export class UpdateGastoDto extends PartialType(CreateGastoDto) {}
