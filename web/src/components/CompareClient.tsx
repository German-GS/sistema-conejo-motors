'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, formatCRC } from '@/lib/api';
import type { Vehicle } from '@/types';

const MAX = 3;

const SPECS: { label: string; key: keyof Vehicle; unit?: string }[] = [
  { label: 'Precio', key: 'precio_venta_final' },
  { label: 'Año', key: 'año' },
  { label: 'Autonomía', key: 'autonomia_km', unit: 'km' },
  { label: 'Batería', key: 'capacidad_bateria_kwh', unit: 'kWh' },
  { label: 'Potencia', key: 'potencia_hp', unit: 'HP' },
  { label: 'Torque', key: 'torque_nm', unit: 'Nm' },
  { label: '0–100 km/h', key: 'aceleracion_0_100', unit: 's' },
  { label: 'Vel. Máxima', key: 'velocidad_maxima', unit: 'km/h' },
  { label: 'Carga DC', key: 'tiempo_carga_dc', unit: 'min' },
  { label: 'Carga AC', key: 'tiempo_carga_ac', unit: 'h' },
  { label: 'Pasajeros', key: 'numero_pasajeros' },
  { label: 'Maletero', key: 'capacidad_maletero_l', unit: 'L' },
  { label: 'Peso', key: 'peso_kg', unit: 'kg' },
  { label: 'Tracción', key: 'traccion' },
];

export function CompareClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [selected, setSelected] = useState<(Vehicle | null)[]>([null, null, null]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const count = selected.filter(Boolean).length;

  const toggle = (v: Vehicle, slotIdx: number) => {
    // Remove from other slots if already selected
    setSelected(prev => prev.map((s, i) => {
      if (s?.id === v.id) return null;        // clear existing slot
      if (i === slotIdx) return v;             // place in target slot
      return s;
    }));
    setPickerSlot(null);
    setSearch('');
  };

  const clearSlot = (i: number) => {
    setSelected(prev => prev.map((s, idx) => idx === i ? null : s));
  };

  const getVal = (v: Vehicle, key: keyof Vehicle) => v[key] ?? null;

  const getBest = (key: keyof Vehicle): number | null => {
    const vals = selected.filter(Boolean).map(v => Number(getVal(v!, key))).filter(x => !isNaN(x) && x > 0);
    if (!vals.length) return null;
    const highBetter: (keyof Vehicle)[] = ['autonomia_km', 'capacidad_bateria_kwh', 'potencia_hp', 'torque_nm', 'velocidad_maxima', 'numero_pasajeros', 'capacidad_maletero_l'];
    return highBetter.includes(key) ? Math.max(...vals) : Math.min(...vals);
  };

  const filteredVehicles = vehicles.filter(v =>
    `${v.marca} ${v.modelo} ${v.año}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ paddingTop: '96px', paddingBottom: '4rem', minHeight: '100vh', background: '#f8fafc' }}>
      <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ display:'inline-block', background:'rgba(2,79,125,0.1)', color:'#024f7d', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 1rem', borderRadius:'99px', marginBottom:'0.75rem' }}>
            Comparador
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#071f37', marginBottom: '0.4rem' }}>
            Compara Vehículos Eléctricos
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Selecciona hasta {MAX} vehículos para ver sus diferencias lado a lado
          </p>
        </div>

        {/* ── 3 RANURAS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {[0, 1, 2].map(i => {
            const v = selected[i];
            const imgSrc = v?.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url)
              : v?.profile?.imagenes?.[0]?.url ? getImageUrl(v.profile.imagenes[0].url)
              : '/placeholder.png';
            return (
              <div key={i}
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  border: pickerSlot === i ? '2px solid #024f7d' : v ? '2px solid #04c7b2' : '2px dashed #cbd5e1',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: v ? '0 4px 20px rgba(4,199,178,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                {/* Slot número */}
                <div style={{ padding: '0.75rem 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: v ? '#04c7b2' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Vehículo {i + 1}
                  </span>
                  {v && (
                    <button onClick={() => clearSlot(i)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '2px 4px' }}
                      aria-label="Quitar">×</button>
                  )}
                </div>

                {v ? (
                  /* Vehículo seleccionado */
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.75rem 1rem 1rem' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem', background: '#f1f5f9' }}>
                      <Image src={imgSrc} alt={v.modelo} fill className="object-cover" sizes="400px" />
                    </div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#071f37', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>
                      {v.marca} {v.modelo}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{v.año}</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#024f7d' }}>
                      {formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}
                    </p>
                    <button onClick={() => { setPickerSlot(i); setSearch(''); }}
                      style={{ marginTop: 'auto', paddingTop: '0.6rem', fontSize: '0.78rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' }}>
                      Cambiar modelo
                    </button>
                  </div>
                ) : (
                  /* Ranura vacía */
                  <button onClick={() => { setPickerSlot(i); setSearch(''); }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', background: 'none', border: 'none', padding: '1.5rem', color: '#94a3b8' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: pickerSlot === i ? '#e0f2fe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', transition: 'background 0.2s' }}>
                      +
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: pickerSlot === i ? '#024f7d' : '#94a3b8' }}>
                      {pickerSlot === i ? 'Seleccionando...' : 'Agregar vehículo'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── PICKER de vehículos ── */}
        {pickerSlot !== null && (
          <div style={{ background: '#fff', borderRadius: '18px', border: '1.5px solid #e2e8f0', padding: '1.5rem', marginBottom: '2.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700, color: '#071f37', fontSize: '0.95rem' }}>
                Seleccionando para Vehículo {pickerSlot + 1}
              </h3>
              <button onClick={() => { setPickerSlot(null); setSearch(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.3rem' }}>×</button>
            </div>
            {/* Buscador */}
            <input
              type="text"
              placeholder="Buscar por marca o modelo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', marginBottom: '1rem', outline: 'none', color: '#071f37' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredVehicles.map(v => {
                const alreadySelected = selected.some(s => s?.id === v.id);
                const imgSrc = v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url)
                  : v.profile?.imagenes?.[0]?.url ? getImageUrl(v.profile.imagenes[0].url)
                  : '/placeholder.png';
                return (
                  <button key={v.id}
                    onClick={() => !alreadySelected && toggle(v, pickerSlot)}
                    disabled={alreadySelected}
                    style={{
                      background: alreadySelected ? '#f1f5f9' : '#fff',
                      border: alreadySelected ? '1.5px solid #e2e8f0' : '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      cursor: alreadySelected ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      opacity: alreadySelected ? 0.5 : 1,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { if (!alreadySelected) { (e.currentTarget as HTMLButtonElement).style.borderColor='#024f7d'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 2px 10px rgba(2,79,125,0.1)'; }}}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.boxShadow='none'; }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.5rem', background: '#f1f5f9' }}>
                      <Image src={imgSrc} alt={v.modelo} fill className="object-cover" sizes="200px" />
                    </div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#071f37', textTransform: 'uppercase' }}>{v.marca} {v.modelo}</p>
                    <p style={{ fontSize: '0.72rem', color: '#64748b' }}>{v.año} · {formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TABLA COMPARATIVA ── */}
        {count >= 2 && (
          <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ background: 'linear-gradient(135deg, #071f37 0%, #082d4b 100%)', padding: '1.25rem 1.5rem' }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>Comparativa de especificaciones</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600, color: '#64748b', width: '160px', whiteSpace: 'nowrap' }}>Especificación</th>
                    {selected.map((v, i) => v ? (
                      <th key={i} style={{ padding: '1rem', textAlign: 'center', minWidth: '180px' }}>
                        <div style={{ fontWeight: 800, color: '#071f37' }}>{v.marca} {v.modelo}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>{v.año}</div>
                      </th>
                    ) : null)}
                  </tr>
                </thead>
                <tbody>
                  {/* Imagen */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', color: '#64748b', fontWeight: 600 }}>Imagen</td>
                    {selected.map((v, i) => v ? (
                      <td key={i} style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ position: 'relative', width: '100px', height: '64px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }}>
                          <Image
                            src={v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url) : '/placeholder.png'}
                            alt={v.modelo} fill className="object-cover" sizes="100px" />
                        </div>
                      </td>
                    ) : null)}
                  </tr>

                  {SPECS.map(({ label, key, unit }, rowIdx) => {
                    const best = getBest(key);
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid #f1f5f9', background: rowIdx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</td>
                        {selected.map((v, i) => {
                          if (!v) return null;
                          const val = getVal(v, key);
                          const isBest = best !== null && Number(val) === best;
                          const display = key === 'precio_venta_final'
                            ? formatCRC(Number(v.precio_venta_final ?? v.precio_venta))
                            : val != null ? `${val}${unit ? ' ' + unit : ''}` : '—';
                          return (
                            <td key={i} style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: isBest && val ? 800 : 600, color: isBest && val ? '#04c7b2' : val ? '#071f37' : '#cbd5e1' }}>
                              {display}{isBest && val ? ' ⭐' : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Ver ficha */}
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '1rem', color: '#64748b', fontWeight: 600 }}>Ficha técnica</td>
                    {selected.map((v, i) => v ? (
                      <td key={i} style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link href={`/catalog/${v.id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#024f7d', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '0.55rem 1.2rem', borderRadius: '8px', textDecoration: 'none', transition: 'opacity 0.2s' }}
                          className="hover:opacity-90">
                          Ver ficha →
                        </Link>
                      </td>
                    ) : null)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {count === 1 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚖️</div>
            <p style={{ fontWeight: 600 }}>Selecciona al menos un vehículo más para comparar</p>
          </div>
        )}

        {count === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚗</div>
            <p style={{ fontWeight: 600 }}>Toca una ranura para elegir un vehículo</p>
          </div>
        )}
      </div>
    </div>
  );
}
