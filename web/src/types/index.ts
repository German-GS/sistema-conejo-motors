// src/types/index.ts

export interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color?: string;
  precio_venta: number;
  precio_venta_usd?: number | string | null;
  precio_venta_final?: number | null;
  descuento_porcentaje?: number | null;
  autonomia_km?: number | null;
  capacidad_bateria_kwh?: number | null;
  aceleracion_0_100?: number | null;
  potencia_hp?: number | null;
  torque_nm?: number | null;
  velocidad_maxima?: number | null;
  tiempo_carga_dc?: number | null;
  tiempo_carga_ac?: number | null;
  largo_mm?: number | null;
  ancho_mm?: number | null;
  alto_mm?: number | null;
  distancia_ejes_mm?: number | null;
  peso_kg?: number | null;
  capacidad_maletero_l?: number | null;
  numero_pasajeros?: number | null;
  traccion?: string;
  categoria?: string;
  visibilidad?: 'Visible' | 'Oculto' | 'Agotado' | 'Contrapedido';
  imagenes?: { id?: number; url: string }[];
  profile?: { imagenes?: { url: string }[] };
  colores_disponibles?: string[];
  seguridad?: string[];
  interior?: string[];
  exterior?: string[];
  tecnologia?: string[];
}

export interface CarouselSlide {
  title: string;
  subtitle: string;
  imageUrl: string;
  mediaType?: 'image' | 'video'; // omitido = imagen (retrocompatible)
}

export interface SiteSetting {
  key: string;
  value: string;
}
