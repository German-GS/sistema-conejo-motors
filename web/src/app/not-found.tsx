import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Página no encontrada', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-8xl mb-4">🐇</div>
      <h1 className="text-4xl font-black text-gray-900 mb-3">404 — Página no encontrada</h1>
      <p className="text-gray-500 mb-8 max-w-md">Lo sentimos, la página que buscas no existe o fue movida.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="btn-primary">Ir al inicio</Link>
        <Link href="/catalog" className="btn-outline">Ver catálogo</Link>
      </div>
    </div>
  );
}
