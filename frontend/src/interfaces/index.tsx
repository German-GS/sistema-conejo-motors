// src/interfaces/index.tsx

export interface Bodega {
  id: number;
  nombre: string;
}

export interface ProfileImage {
  id: number;
  url: string;
  order: number;
}

export interface VehicleProfile {
  id: number;
  marca: string;
  modelo: string;
  imagenes?: ProfileImage[];
}

// This is the main, centralized Vehicle interface
export interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  vin: string;
  color: string;
  precio_costo: number;
  precio_venta: number;
  estado: string;
  bodega?: Bodega;
  profile?: VehicleProfile;
  imagenes?: ProfileImage[]; // Vehicle's own specific images
}

// Keep your other interfaces like User and TrackingLog
export interface User {
  id: number;
  email: string;
}

export interface TrackingLog {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  vehicle: Vehicle; // Note: This now uses the full Vehicle type
  departureUser: User;
}
