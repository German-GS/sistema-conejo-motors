'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl, formatCRC } from '@/lib/api';
import type { Vehicle } from '@/types';

const PAGE_SIZE = 12;

export function CatalogClient({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const [filterCategoria, setFilterCategoria] = useState('Todas');
  const [filterMarca, setFilterMarca] = useState('Todas');
  const [filterColor, setFilterColor] = useState('Todos');
  const [filterPrecioMax, setFilterPrecioMax] = useState(0); // 0 = sin límite
  const [filterAutonomiaMin, setFilterAutonomiaMin] = useState(0);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categorias = useMemo(() => ['Todas', ...Array.from(new Set(initialVehicles.map(v => v.categoria || 'Sin Categoría'))).sort()], [initialVehicles]);
  const marcas = useMemo(() => ['Todas', ...Array.from(new Set(initialVehicles.map(v => v.marca))).sort()], [initialVehicles]);
  const colores = useMemo(() => ['Todos', ...Array.from(new Set(initialVehicles.map(v => v.color).filter(Boolean) as string[])).sort()], [initialVehicles]);
  const precioMaxReal = useMemo(() => initialVehicles.length ? Math.max(...initialVehicles.map(v => Number(v.precio_venta_final ?? v.precio_venta))) : 60_000_000, [initialVehicles]);

  const effectivePrecioMax = filterPrecioMax || precioMaxReal;

  const filtered = useMemo(() => initialVehicles.filter(v => {
    const precio = Number(v.precio_venta_final ?? v.precio_venta);
    return (
      (filterCategoria === 'Todas' || (v.categoria || 'Sin Categoría') === filterCategoria) &&
      (filterMarca === 'Todas' || v.marca === filterMarca) &&
      (filterColor === 'Todos' || v.color === filterColor) &&
      precio <= effectivePrecioMax &&
      Number(v.autonomia_km ?? 0) >= filterAutonomiaMin
    );
  }), [initialVehicles, filterCategoria, filterMarca, filterColor, effectivePrecioMax, filterAutonomiaMin]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reset = () => {
    setFilterCategoria('Todas'); setFilterMarca('Todas'); setFilterColor('Todos');
    setFilterPrecioMax(0); setFilterAutonomiaMin(0); setPage(1);
  };

  const hasFilters = filterCategoria !== 'Todas' || filterMarca !== 'Todas' || filterColor !== 'Todos' || filterPrecioMax > 0 || filterAutonomiaMin > 0;

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
          {filterMarca !== 'Todas' ? `Vehículos Eléctricos ${filterMarca}` : 'Catálogo de Vehículos Eléctricos'}
        </h1>
        <p className="text-gray-500">
          {filtered.length} vehículo{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          {filterMarca !== 'Todas' && ` · ${filterMarca}`}
          {filterCategoria !== 'Todas' && ` · ${filterCategoria}`}
        </p>
      </div>

      {/* Filtros — desktop siempre visible, mobile toggle */}
      <div className="mb-6">
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 font-semibold text-gray-700 mb-3">
          <span>🔍 Filtros {hasFilters && <span className="ml-1 text-xs bg-[#1a1a2e] text-white px-2 py-0.5 rounded-full">activos</span>}</span>
          <span>{filtersOpen ? '▲' : '▼'}</span>
        </button>

        <div className={`bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-5 ${filtersOpen ? 'block' : 'hidden md:block'}`}>
          {/* Categorías como pills */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <button key={cat} onClick={() => { setFilterCategoria(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterCategoria === cat ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1a1a2e] hover:text-[#1a1a2e]'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Marca */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Marca</label>
              <select value={filterMarca} onChange={e => { setFilterMarca(e.target.value); setPage(1); }} className="form-input">
                {marcas.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {/* Color */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Color</label>
              <select value={filterColor} onChange={e => { setFilterColor(e.target.value); setPage(1); }} className="form-input">
                {colores.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {/* Precio */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Precio máx: <span className="text-[#1a1a2e] font-bold">{formatCRC(effectivePrecioMax)}</span>
              </label>
              <input type="range" min={0} max={precioMaxReal} step={500_000}
                value={filterPrecioMax || precioMaxReal}
                onChange={e => { setFilterPrecioMax(Number(e.target.value)); setPage(1); }} />
            </div>
            {/* Autonomía */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Autonomía mín: <span className="text-[#1a1a2e] font-bold">{filterAutonomiaMin} km</span>
              </label>
              <input type="range" min={0} max={600} step={25} value={filterAutonomiaMin}
                onChange={e => { setFilterAutonomiaMin(Number(e.target.value)); setPage(1); }} />
            </div>
          </div>

          {hasFilters && (
            <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              ✕ Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">😔</div>
          <p className="text-lg text-gray-600 mb-4">No hay vehículos con esos filtros.</p>
          <button onClick={reset} className="btn-primary">Ver todos los modelos</button>
        </div>
      ) : (
        <>
          <div className="grid-vehicles">
            {paginated.map(vehicle => {
              const imgSrc = vehicle.imagenes?.[0]?.url ? getImageUrl(vehicle.imagenes[0].url)
                : vehicle.profile?.imagenes?.[0]?.url ? getImageUrl(vehicle.profile.imagenes[0].url)
                : '/placeholder.png';
              const precio = Number(vehicle.precio_venta_final ?? vehicle.precio_venta);
              const agotado = vehicle.visibilidad === 'Agotado';
              const pedido = vehicle.visibilidad === 'Contrapedido';
              return (
                <Link key={vehicle.id} href={`/catalog/${vehicle.id}`} className="vehicle-card group block">
                  <div className="vehicle-card__img">
                    <Image src={imgSrc} alt={`${vehicle.marca} ${vehicle.modelo} ${vehicle.año}`}
                      fill className="object-cover group-hover:scale-105 transition-transform duration-400" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                    {Number(vehicle.descuento_porcentaje) > 0 && (
                      <span className="badge-discount">−{vehicle.descuento_porcentaje}%</span>
                    )}
                    {vehicle.categoria && <span className="badge-category">{vehicle.categoria}</span>}
                    {agotado && <div className="badge-agotado">📦 Agotado</div>}
                    {pedido && <div className="badge-pedido">🔄 Bajo Pedido</div>}
                  </div>
                  <div className="vehicle-card__body">
                    <h2 className="vehicle-card__name">{vehicle.marca} {vehicle.modelo} ({vehicle.año})</h2>
                    <p className="vehicle-card__price">{formatCRC(precio)}</p>
                    {Number(vehicle.descuento_porcentaje) > 0 && (
                      <p className="vehicle-card__old-price">{formatCRC(Number(vehicle.precio_venta))}</p>
                    )}
                    <div className="vehicle-card__specs">
                      {vehicle.autonomia_km && <span>🛣️ {vehicle.autonomia_km} km</span>}
                      {vehicle.aceleracion_0_100 && <span>⚡ {vehicle.aceleracion_0_100}s</span>}
                    </div>
                    <div className="vehicle-card__actions mt-2">
                      <span className="text-sm py-2 flex-1 text-center font-semibold text-white rounded-xl"
                        style={{ background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Ver Ficha Técnica
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
              <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 1} className="btn-ghost px-3 py-2 disabled:opacity-40">‹ Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-[#00a651] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === totalPages} className="btn-ghost px-3 py-2 disabled:opacity-40">Siguiente ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
