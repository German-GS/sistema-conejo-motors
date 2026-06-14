// Mapa de nombres de color (español) → color aproximado real (hex) para los swatches.
// Para colores claros se devuelve también un borde para que el círculo se vea.

interface Swatch { hex: string; border?: string; }

const MAP: Record<string, Swatch> = {
  blanco: { hex: '#f4f4f5', border: '#cbd5e1' },
  perla: { hex: '#f1efe9', border: '#d6d3cb' },
  negro: { hex: '#18181b' },
  gris: { hex: '#9ca3af' },
  'gris oscuro': { hex: '#4b5563' },
  grafito: { hex: '#374151' },
  plateado: { hex: '#c7ccd1', border: '#b0b6bd' },
  plata: { hex: '#c7ccd1', border: '#b0b6bd' },
  celeste: { hex: '#7ec8e3' },
  'azul claro': { hex: '#7ec8e3' },
  azul: { hex: '#1e40af' },
  'azul marino': { hex: '#1e3a5f' },
  turquesa: { hex: '#14b8a6' },
  verde: { hex: '#16a34a' },
  'verde oscuro': { hex: '#166534' },
  rojo: { hex: '#dc2626' },
  vino: { hex: '#7b1e3a' },
  granate: { hex: '#7b1e3a' },
  naranja: { hex: '#f97316' },
  amarillo: { hex: '#facc15' },
  dorado: { hex: '#d4af37' },
  beige: { hex: '#e3d3b0', border: '#cbb98f' },
  cafe: { hex: '#6b4226' },
  marron: { hex: '#6b4226' },
  morado: { hex: '#7c3aed' },
  rosa: { hex: '#ec4899' },
  cobre: { hex: '#b87333' },
  champan: { hex: '#e6d2a8', border: '#cbb98f' },
};

const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Devuelve el hex y borde aproximados para un nombre de color. */
export function colorSwatch(nombre: string): Swatch {
  const n = normalizar(nombre || '');
  if (MAP[n]) return MAP[n];
  // Coincidencia parcial (ej. "azul cielo" → contiene "azul")
  for (const key of Object.keys(MAP)) {
    if (n.includes(key) || key.includes(n)) return MAP[key];
  }
  // Desconocido: gris neutro con borde
  return { hex: '#cbd5e1', border: '#94a3b8' };
}
