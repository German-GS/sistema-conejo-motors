// app/catalog/page.tsx — SSR: lista de vehículos para Google
import type { Metadata } from 'next';
import { fetchAPI } from '@/lib/api';
import type { Vehicle } from '@/types';
import { CatalogClient } from '@/components/CatalogClient';

export const metadata: Metadata = {
  title: 'Catálogo de Vehículos Eléctricos',
  description:
    'Catálogo completo de vehículos eléctricos en Conejo Motors Costa Rica. BYD, MG, GWM y más marcas. Filtra por precio, autonomía y categoría.',
  alternates: { canonical: 'https://conejomotors.com/catalog' },
  openGraph: {
    title: 'Catálogo de Vehículos Eléctricos | Conejo Motors',
    description: 'Encuentra tu vehículo eléctrico ideal. Filtra por marca, precio y autonomía.',
    url: 'https://conejomotors.com/catalog',
  },
};

export default async function CatalogPage() {
  let vehicles: Vehicle[] = [];
  try {
    vehicles = await fetchAPI<Vehicle[]>('/vehicles/sales/catalog', undefined, false);
  } catch { /* API en cold start */ }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catálogo de Vehículos Eléctricos — Conejo Motors',
    numberOfItems: vehicles.length,
    itemListElement: vehicles.slice(0, 10).map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${v.marca} ${v.modelo} ${v.año}`,
      url: `https://conejomotors.com/catalog/${v.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CatalogClient initialVehicles={vehicles} />
    </>
  );
}
