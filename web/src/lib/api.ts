// src/lib/api.ts — cliente API centralizado para Next.js
const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  'https://conejo-motors-backend-18412185769.us-central1.run.app';

export const API = API_BASE;

export function getImageUrl(url?: string | null): string {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}/${url}`;
}

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 300 }, // ISR: revalidar cada 5 min
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const formatCRC = (value: number) =>
  new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(value);
