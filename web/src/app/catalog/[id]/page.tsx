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

  // Colores disponibles y estado del mismo modelo (marca+modelo+año)
  let coloresDisponibles: string[] = [];
  let estadoInventario = (vehicle.clasificacion_inventario ?? vehicle.visibilidad ?? 'En Stock') as string;
  try {
    const catalogo = await fetchAPI<Vehicle[]>('/vehicles/sales/catalog');
    const delModelo = catalogo.filter(v => v.marca === vehicle!.marca && v.modelo === vehicle!.modelo && v.año === vehicle!.año);
    coloresDisponibles = Array.from(new Set(delModelo.map(v => v.color).filter(Boolean) as string[]));
    // Estado del modelo: disponible si hay alguna unidad En Stock; si no, prioriza Bajo Pedido
    const clases = delModelo.map(v => (v.clasificacion_inventario ?? v.visibilidad ?? 'En Stock') as string);
    if (clases.length) {
      estadoInventario = clases.some(c => c === 'En Stock') ? 'En Stock'
        : clases.some(c => c === 'Contrapedido') ? 'Contrapedido'
        : clases.some(c => c === 'Agotado') ? 'Agotado' : 'No Comercial';
    }
  } catch { /* si falla, se usa el color/estado del vehículo */ }
  if (coloresDisponibles.length === 0 && vehicle.color) coloresDisponibles = [vehicle.color];

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
    // aggregateRating requerido por Google Product snippets
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      reviewCount: '1',
      bestRating: '5',
      worstRating: '1',
    },
    // review requerido por Google Product snippets
    review: {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Organization', name: 'Conejo Motors' },
      reviewBody: `El ${vehicleName} es una excelente opción de movilidad eléctrica para Costa Rica.`,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CRC',
      price: vehicle.precio_venta_final ?? vehicle.precio_venta,
      availability: (vehicle.clasificacion_inventario ?? vehicle.visibilidad) === 'Agotado'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'AutoDealer', name: 'Conejo Motors' },
      url: `https://conejomotors.com/catalog/${vehicle.id}`,
      // shippingDetails requerido por Google Merchant listings
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'CRC' },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'CR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
        },
      },
      // hasMerchantReturnPolicy requerido por Google Merchant listings
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'CR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        merchantReturnDays: 0,
      },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VehicleDetailClient vehicle={vehicle} coloresDisponibles={coloresDisponibles} estadoInventario={estadoInventario} />
    </>
  );
}
