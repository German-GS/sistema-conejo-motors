import type { Metadata } from 'next';
import { fetchAPI } from '@/lib/api';
import type { Vehicle } from '@/types';
import { CompareClient } from '@/components/CompareClient';

export const metadata: Metadata = {
  title: 'Comparador de Vehículos Eléctricos',
  description: 'Compara hasta 3 vehículos eléctricos lado a lado. Autonomía, precio, potencia y más especificaciones en Conejo Motors Costa Rica.',
  alternates: { canonical: 'https://conejomotors.com/compare' },
};

export default async function ComparePage() {
  let vehicles: Vehicle[] = [];
  try {
    vehicles = await fetchAPI<Vehicle[]>('/vehicles/sales/catalog');
  } catch { /* API en cold start */ }
  return <CompareClient vehicles={vehicles} />;
}
