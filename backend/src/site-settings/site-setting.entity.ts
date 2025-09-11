import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'site_settings' })
export class SiteSetting {
  /**
   * La clave única para la configuración.
   * Ejemplos: 'carousel_slides', 'featured_vehicles'.
   */
  @PrimaryColumn({ length: 50 })
  key: string;

  /**
   * El valor de la configuración, guardado como un string en formato JSON.
   * Esto nos da flexibilidad para almacenar desde listas de IDs hasta objetos complejos.
   * Ejemplo para 'carousel_slides': '[{"imageUrl": "...", "title": "..."}, ...]'
   * Ejemplo para 'featured_vehicles': '[1, 5, 8]'
   */
  @Column({ type: 'text' })
  value: string;
}
