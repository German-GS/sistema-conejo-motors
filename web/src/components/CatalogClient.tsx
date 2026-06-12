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

  // Solo contar disponibles (excluye Agotado y Contrapedido) para el header
  const disponibles = useMemo(() => initialVehicles.filter(v =>
    v.visibilidad !== 'Agotado' && v.visibilidad !== 'Contrapedido'
  ), [initialVehicles]);

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

  const filteredDisponibles = useMemo(() => filtered.filter(v =>
    v.visibilidad !== 'Agotado' && v.visibilidad !== 'Contrapedido'
  ), [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reset = () => {
    setFilterCategoria('Todas'); setFilterMarca('Todas'); setFilterColor('Todos');
    setFilterPrecioMax(0); setFilterAutonomiaMin(0); setPage(1);
  };

  const hasFilters = filterCategoria !== 'Todas' || filterMarca !== 'Todas' || filterColor !== 'Todos' || filterPrecioMax > 0 || filterAutonomiaMin > 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px clamp(1rem, 4vw, 2rem) 4rem' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
          {filterMarca !== 'Todas' ? `Vehículos Eléctricos ${filterMarca}` : 'Catálogo de Vehículos Eléctricos'}
        </h1>
        <p className="text-gray-500">
          <span style={{ fontWeight:700, color:'#024f7d' }}>{filteredDisponibles.length}</span> disponible{filteredDisponibles.length !== 1 ? 's' : ''}
          {filtered.length !== filteredDisponibles.length && <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}> · {filtered.length - filteredDisponibles.length} con disponibilidad especial</span>}
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

        <div className={`rounded-2xl border border-gray-100 ${filtersOpen ? 'block' : 'hidden md:block'}`}
          style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>

          {/* Fila 1 — Categorías */}
          <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#024f7d', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'0.8rem' }}>Categoría</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
              {categorias.map(cat => (
                <button key={cat} onClick={() => { setFilterCategoria(cat); setPage(1); }}
                  style={{ padding:'0.5rem 1.1rem', borderRadius:'99px', fontSize:'0.875rem', fontWeight:600, border: filterCategoria===cat ? 'none' : '1.5px solid #e2e8f0', background: filterCategoria===cat ? '#024f7d' : '#f8fafc', color: filterCategoria===cat ? '#fff' : '#64748b', cursor:'pointer', transition:'all 0.15s' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 2 — Marca / Color / Precio / Autonomía */}
          <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap:'1.25rem', alignItems:'end' }}>
              {/* Marca */}
              <div>
                <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, color:'#024f7d', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'0.6rem' }}>Marca</label>
                <select value={filterMarca} onChange={e => { setFilterMarca(e.target.value); setPage(1); }}
                  style={{ width:'100%', padding:'0.7rem 1rem', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', color:'#071f37', background:'#fff', outline:'none', cursor:'pointer' }}>
                  {marcas.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {/* Color */}
              <div>
                <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, color:'#024f7d', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'0.6rem' }}>Color</label>
                <select value={filterColor} onChange={e => { setFilterColor(e.target.value); setPage(1); }}
                  style={{ width:'100%', padding:'0.7rem 1rem', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', color:'#071f37', background:'#fff', outline:'none', cursor:'pointer' }}>
                  {colores.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* Precio */}
              <div>
                <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, color:'#024f7d', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'0.35rem' }}>
                  Precio máximo
                </label>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                  <span style={{ fontSize:'0.78rem', color:'#94a3b8' }}>₡0</span>
                  <span style={{ fontSize:'0.82rem', fontWeight:800, color:'#071f37' }}>{formatCRC(effectivePrecioMax)}</span>
                </div>
                <input type="range" min={0} max={precioMaxReal} step={500_000}
                  value={filterPrecioMax || precioMaxReal}
                  onChange={e => { setFilterPrecioMax(Number(e.target.value)); setPage(1); }} />
              </div>
              {/* Autonomía */}
              <div>
                <label style={{ display:'block', fontSize:'0.68rem', fontWeight:700, color:'#024f7d', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'0.35rem' }}>
                  Autonomía mínima
                </label>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                  <span style={{ fontSize:'0.78rem', color:'#94a3b8' }}>0 km</span>
                  <span style={{ fontSize:'0.82rem', fontWeight:800, color:'#071f37' }}>{filterAutonomiaMin} km</span>
                </div>
                <input type="range" min={0} max={600} step={25} value={filterAutonomiaMin}
                  onChange={e => { setFilterAutonomiaMin(Number(e.target.value)); setPage(1); }} />
              </div>
            </div>

            {hasFilters && (
              <div style={{ marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid #f1f5f9' }}>
                <button onClick={reset}
                  style={{ fontSize:'0.82rem', color:'#ef4444', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', padding:'0.4rem 1rem', borderRadius:'8px', cursor:'pointer', fontWeight:600, transition:'all 0.15s' }}>
                  ✕ Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div style={{ marginTop: '2rem' }} />
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">😔</div>
          <p className="text-lg text-gray-600 mb-4">No hay vehículos con esos filtros.</p>
          <button onClick={reset} className="btn-primary">Ver todos los modelos</button>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap:'1.5rem' }}>
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
                    <p className="vehicle-card__price">
                      {formatCRC(precio)}
                      {vehicle.precio_venta_usd && (
                        <span style={{ fontSize: '0.7em', color: '#64748b', marginLeft: '0.5rem', fontWeight: 500 }}>
                          / ${Number(vehicle.precio_venta_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                        </span>
                      )}
                    </p>
                    {Number(vehicle.descuento_porcentaje) > 0 && (
                      <p className="vehicle-card__old-price">{formatCRC(Number(vehicle.precio_venta))}</p>
                    )}
                    <div className="vehicle-card__specs">
                      {vehicle.autonomia_km && <span>🛣️ {vehicle.autonomia_km} km</span>}
                      {vehicle.aceleracion_0_100 && <span>⚡ {vehicle.aceleracion_0_100}s</span>}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'0.75rem', borderRadius:'12px', background:'#024f7d', color:'#fff', fontWeight:700, fontSize:'0.92rem', letterSpacing:'0.02em', cursor:'pointer' }}>
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
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-[#024f7d] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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
