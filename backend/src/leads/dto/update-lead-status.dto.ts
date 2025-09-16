// backend/src/leads/dto/update-lead-status.dto.ts
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { type LeadStatus } from '../lead.entity';

export class UpdateLeadStatusDto {
  @IsOptional()
  @IsIn(['Nuevo', 'Contactado', 'En Progreso', 'Cerrado'])
  estado?: LeadStatus;

  @IsOptional()
  @IsBoolean()
  contacted_by_email?: boolean;

  @IsOptional()
  @IsBoolean()
  contacted_by_phone?: boolean;
}