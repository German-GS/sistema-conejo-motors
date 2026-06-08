import type { MetadataRoute } from 'next';
import { fetchAPI } from '@/lib/api';
import type { Vehicle } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://conejomotors.com';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  try {
    const vehicles = await fetchAPI<Vehicle[]>('/vehicles/sales/catalog');
    const vehicleRoutes: MetadataRoute.Sitemap = vehicles.map(v => ({
      url: `${base}/catalog/${v.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...vehicleRoutes];
  } catch {
    return staticRoutes;
  }
}
