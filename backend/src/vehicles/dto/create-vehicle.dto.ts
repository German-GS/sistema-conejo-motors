// backend/src/vehicles/dto/create-vehicle.dto.ts
export class CreateVehicleDto {
  vin: string;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  precio_costo: number;
  precio_venta: number;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  estado?: string; // Opcional, ya que tiene un valor por defecto
  bodegaId?: number; // Opcional por ahora
}
