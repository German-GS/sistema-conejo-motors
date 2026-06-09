// app/page.tsx — Server Component: datos cargados en el servidor para SEO
import type { Metadata } from 'next';
import { fetchAPI } from '@/lib/api';
import type { Vehicle, CarouselSlide, SiteSetting } from '@/types';
import { HomeClient } from '@/components/HomeClient';
export const revalidate = 3600; // ISR: revalidar cada hora

export const metadata: Metadata = {
  title: 'Vehículos Eléctricos en Costa Rica',
  description:
    'Conejo Motors: concesionario de vehículos eléctricos en Costa Rica. BYD, MG, GWM y más marcas. Catálogo completo, financiamiento y test drive disponible.',
  alternates: { canonical: 'https://conejomotors.com' },
  openGraph: {
    title: 'Conejo Motors — Vehículos Eléctricos en Costa Rica',
    description: 'Concesionario especializado en vehículos eléctricos. Mejores precios, financiamiento y garantía en Costa Rica.',
    url: 'https://conejomotors.com',
  },
};

export default async function HomePage() {
  let slides: CarouselSlide[] = [];
  let featuredVehicles: Vehicle[] = [];

  try {
    const settings = await fetchAPI<SiteSetting[]>('/site-settings/public');
    slides = JSON.parse(settings.find(s => s.key === 'carousel_slides')?.value || '[]');
    const featuredIds: number[] = JSON.parse(
      settings.find(s => s.key === 'featured_vehicles')?.value || '[]'
    );
    if (featuredIds.length > 0) {
      const results = await Promise.allSettled(
        featuredIds.map(id => fetchAPI<Vehicle>(`/vehicles/${id}`))
      );
      featuredVehicles = results
        .filter((r): r is PromiseFulfilledResult<Vehicle> => r.status === 'fulfilled')
        .map(r => r.value);
    }
  } catch { /* API en cold start — la página carga igual sin datos dinámicos */ }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Conejo Motors',
    url: 'https://conejomotors.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://conejomotors.com/catalog?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* H1 estático para SEO — visualmente oculto, semánticamente presente */}
      <h1 style={{ position:'absolute', width:'1px', height:'1px', padding:0, margin:'-1px', overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0 }}>
        Agencia de Vehículos Eléctricos en Costa Rica
      </h1>
      <HomeClient slides={slides} featuredVehicles={featuredVehicles} />
    </>
  );
}
