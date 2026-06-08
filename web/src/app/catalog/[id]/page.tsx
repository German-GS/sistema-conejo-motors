// app/catalog/[id]/page.tsx — SSG con generateStaticParams
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchAPI, getImageUrl, formatCRC } from '@/lib/api';
import type { Vehicle } from '@/types';
import { VehicleDetailClient } from '@/components/VehicleDetailClient';

interface Props { params: Promise<{ id: string }> }

// Pre-generar las páginas de todos los vehículos en build time
export async function generateStaticParams() {
  try {
    const vehicles = await fetchAPI<Vehicle[]>('/vehicles/sales/catalog');
    return vehicles.map(v => ({ id: String(v.id) }));
  } catch {
    return [];
  }
}

// Metadatos dinámicos por vehículo — Google los lee sin JS
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const v = await fetchAPI<Vehicle>(`/vehicles/${id}`);
    const name = `${v.marca} ${v.modelo} ${v.año ?? ''}`.trim();
    const firstImg = v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url) : undefined;
    const desc = [
      `${name} eléctrico disponible en Conejo Motors Costa Rica.`,
      v.precio_venta ? `Precio: ${formatCRC(v.precio_venta)}.` : '',
      v.autonomia_km ? `Autonomía: ${v.autonomia_km} km.` : '',
      v.capacidad_bateria_kwh ? `Batería: ${v.capacidad_bateria_kwh} kWh.` : '',
    ].filter(Boolean).join(' ');
    return {
      title: `${name} — Precio y Especificaciones`,
      description: desc,
      alternates: { canonical: `https://conejomotors.com/catalog/${id}` },
      openGraph: {
        title: `${name} — Precio y Especificaciones | Conejo Motors`,
        description: desc,
        url: `https://conejomotors.com/catalog/${id}`,
        images: firstImg ? [{ url: firstImg }] : undefined,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Vehículo Eléctrico | Conejo Motors' };
  }
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params;
  let vehicle: Vehicle | null = null;
  try {
    vehicle = await fetchAPI<Vehicle>(`/vehicles/${id}`);
  } catch {
    notFound();
  }
  if (!vehicle) notFound();

  // JSON-LD Product — renderizado en el servidor
  const vehicleName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.año ?? ''}`.trim();
  const firstImg = vehicle.imagenes?.[0]?.url ? getImageUrl(vehicle.imagenes[0].url) : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: vehicleName,
    description: `${vehicleName} eléctrico disponible en Conejo Motors Costa Rica.`,
    brand: { '@type': 'Brand', name: vehicle.marca },
    model: vehicle.modelo,
    vehicleModelDate: vehicle.año ? String(vehicle.año) : undefined,
    fuelType: 'Electric',
    image: firstImg ? [firstImg] : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CRC',
      price: vehicle.precio_venta_final ?? vehicle.precio_venta,
      availability: vehicle.visibilidad === 'Agotado'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'AutoDealer', name: 'Conejo Motors' },
      url: `https://conejomotors.com/catalog/${vehicle.id}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VehicleDetailClient vehicle={vehicle} />
    </>
  );
}
