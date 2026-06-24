export class CreateCampanaDto {
  nombre: string;
  plataforma: string;
  fecha_inicio: string;
  fecha_fin?: string;
  presupuesto_crc?: number;
  objetivo?: string;
}
