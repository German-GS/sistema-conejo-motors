export interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  year: number;
  vin: string;
  color: string;
  currentLocation: string;
  // Agrega aquí cualquier otra propiedad que tengan tus vehículos
}

export interface User {
  id: number;
  email: string;
  // Agrega aquí cualquier otra propiedad que tengan tus usuarios
}

export interface TrackingLog {
  id: number;
  origin: string;
  destination: string;
  departureTime: string; // El backend lo envía como string, lo convertiremos a Date si es necesario
  vehicle: Vehicle;
  departureUser: User;
}
