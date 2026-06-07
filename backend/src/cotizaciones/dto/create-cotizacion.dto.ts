import { CreateClienteDto } from '../../clientes/dto/create-cliente.dto';

export class CreateCotizacionDto {
  cliente: CreateClienteDto;
  vehiculoId: number;

  /** Precio de lista */
  precio_lista?: number;
  /** Descuento en monto CRC */
  descuento_monto?: number;
  /** Precio final acordado (base imponible, sin IVA) */
  precio_final: number;

  /** Porcentaje de IVA (default 13). 0 si el producto está exento. */
  iva_porcentaje?: number;

  /** Opcional: si no se envía se calcula automáticamente como hoy + 4 días */
  fecha_expiracion?: Date;

  /** Color preferido del cliente */
  color_solicitado?: string;

  // Gastos de inscripción
  gasto_marchamo?: number;
  gasto_inscripcion?: number;
  gasto_placas?: number;
  gasto_otros?: number;
  gasto_otros_descripcion?: string;

  // Extras
  tipo_combustible?: string;
  regalias?: string;
  notas_cliente?: string;

  /** Lead de origen (opcional — si ya existía antes de la cotización) */
  leadId?: number;

  /**
   * Medio por el que llegó el cliente.
   * Si no se envía leadId, se crea un lead automático con esta fuente.
   */
  fuente_lead?: string;
}
