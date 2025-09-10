import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'vehicle_profiles' })
export class VehicleProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  marca: string;

  @Column({ length: 50 })
  modelo: string;
  
  // 👇 NUEVO CAMPO PARA GUARDAR LA RUTA DEL LOGO 👇
  @Column({ nullable: true })
  logo_url: string;

  @Column()
  potencia_hp: number;

  @Column()
  autonomia_km: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  capacidad_bateria_kwh: number;
}
