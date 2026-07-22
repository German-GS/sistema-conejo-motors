import { Type } from 'class-transformer';
import {
  IsInt, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { CreateClienteDto } from '../../clientes/dto/create-cliente.dto';

export class CreateCotizacionDto {
  @ValidateNested()
  @Type(() => CreateClienteDto)
  cliente: CreateClienteDto;

  @IsInt()
  vehiculoId: number;

  /** Precio de lista */
  @IsOptional()
  @IsNumber()
  precio_lista?: number;

  /** Descuento en monto CRC */
  @IsOptional()
  @IsNumber()
  descuento_monto?: number;

  /** Precio final acordado (base imponible, sin IVA) */
  @IsNumber()
  precio_final: number;

  /** Porcentaje de IVA (default 13). 0 si el producto está exento. */
  @IsOptional()
  @IsNumber()
  iva_porcentaje?: number;

  /** Opcional: si no se envía se calcula automáticamente como hoy + 4 días */
  @IsOptional()
  @Type(() => Date)
  fecha_expiracion?: Date;

  /** Color preferido del cliente */
  @IsOptional()
  @IsString()
  color_solicitado?: string;

  // Gastos de inscripción
  @IsOptional()
  @IsNumber()
  gasto_marchamo?: number;

  @IsOptional()
  @IsNumber()
  gasto_inscripcion?: number;

  @IsOptional()
  @IsNumber()
  gasto_placas?: number;

  @IsOptional()
  @IsNumber()
  gasto_otros?: number;

  @IsOptional()
  @IsString()
  gasto_otros_descripcion?: string;

  // Extras
  @IsOptional()
  @IsString()
  tipo_combustible?: string;

  @IsOptional()
  @IsString()
  regalias?: string;

  @IsOptional()
  @IsString()
  notas_cliente?: string;

  /** Lead de origen (opcional — si ya existía antes de la cotización) */
  @IsOptional()
  @IsInt()
  leadId?: number;

  /**
   * Medio por el que llegó el cliente.
   * Si no se envía leadId, se crea un lead automático con esta fuente.
   */
  @IsOptional()
  @IsString()
  fuente_lead?: string;
}
