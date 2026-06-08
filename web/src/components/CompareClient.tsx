'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, formatCRC } from '@/lib/api';
import type { Vehicle } from '@/types';

const MAX = 3;

// Colores por posición de vehículo
const V_COLORS = ['#024f7d', '#04c7b2', '#f59e0b'];
const V_COLORS_LIGHT = ['rgba(2,79,125,0.12)', 'rgba(4,199,178,0.12)', 'rgba(245,158,11,0.12)'];
const V_COLORS_BORDER = ['rgba(2,79,125,0.4)', 'rgba(4,199,178,0.4)', 'rgba(245,158,11,0.4)'];

const SPEC_GROUPS = [
  {
    key: 'precio', label: '$ Precio', icon: '$',
    specs: [
      { label: 'Precio de lista', key: 'precio_venta' as keyof Vehicle },
      { label: 'Precio con descuento', key: 'precio_venta_final' as keyof Vehicle },
    ],
  },
  {
    key: 'bateria', label: '🔋 Batería y Carga', icon: '🔋',
    specs: [
      { label: 'Capacidad batería (kWh)', key: 'capacidad_bateria_kwh' as keyof Vehicle, unit: 'kWh' },
      { label: 'Autonomía WLTP (km)', key: 'autonomia_km' as keyof Vehicle, unit: 'km' },
      { label: 'Carga DC rápida (min)', key: 'tiempo_carga_dc' as keyof Vehicle, unit: 'min' },
      { label: 'Carga AC (h)', key: 'tiempo_carga_ac' as keyof Vehicle, unit: 'h' },
    ],
  },
  {
    key: 'rendimiento', label: '⚡ Rendimiento', icon: '⚡',
    specs: [
      { label: 'Potencia (HP)', key: 'potencia_hp' as keyof Vehicle, unit: 'HP' },
      { label: 'Torque (Nm)', key: 'torque_nm' as keyof Vehicle, unit: 'Nm' },
      { label: '0–100 km/h', key: 'aceleracion_0_100' as keyof Vehicle, unit: 's' },
      { label: 'Velocidad máxima', key: 'velocidad_maxima' as keyof Vehicle, unit: 'km/h' },
    ],
  },
  {
    key: 'general', label: '🚗 General', icon: '🚗',
    specs: [
      { label: 'Año', key: 'año' as keyof Vehicle },
      { label: 'Tracción', key: 'traccion' as keyof Vehicle },
      { label: 'Pasajeros', key: 'numero_pasajeros' as keyof Vehicle },
      { label: 'Maletero (L)', key: 'capacidad_maletero_l' as keyof Vehicle, unit: 'L' },
      { label: 'Peso (kg)', key: 'peso_kg' as keyof Vehicle, unit: 'kg' },
    ],
  },
];

const ALL_SPECS = SPEC_GROUPS.flatMap(g => g.specs.map(s => ({ ...s, group: g.key })));

const HIGH_BETTER: (keyof Vehicle)[] = ['autonomia_km','capacidad_bateria_kwh','potencia_hp','torque_nm','velocidad_maxima','numero_pasajeros','capacidad_maletero_l'];

export function CompareClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [selected, setSelected] = useState<(Vehicle | null)[]>([null, null, null]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const pickerRef = useRef<HTMLDivElement>(null);

  const count = selected.filter(Boolean).length;

  const openPicker = (slot: number) => {
    setPickerSlot(slot);
    setSearch('');
    // Scroll al picker en mobile con pequeño delay para que se renderice
    setTimeout(() => {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const toggle = (v: Vehicle, slotIdx: number) => {
    setSelected(prev => prev.map((s, i) => {
      if (s?.id === v.id) return null;
      if (i === slotIdx) return v;
      return s;
    }));
    setPickerSlot(null);
    setSearch('');
  };

  const clearSlot = (i: number) => setSelected(prev => prev.map((s, idx) => idx === i ? null : s));

  const getVal = (v: Vehicle, key: keyof Vehicle) => v[key] ?? null;

  const getBest = (key: keyof Vehicle) => {
    const vals = selected.filter(Boolean).map(v => Number(getVal(v!, key))).filter(x => !isNaN(x) && x > 0);
    if (!vals.length) return null;
    return HIGH_BETTER.includes(key) ? Math.max(...vals) : Math.min(...vals);
  };

  const filteredVehicles = vehicles.filter(v =>
    `${v.marca} ${v.modelo} ${v.año}`.toLowerCase().includes(search.toLowerCase())
  );

  const activeVehicles = selected.filter((v): v is Vehicle => v !== null);

  // Autonomía real estimada
  const getAutonomia = (v: Vehicle) => {
    const wltp = Number(v.autonomia_km) || 0;
    return {
      ciudad: Math.round(wltp * 0.88),
      autopista: Math.round(wltp * 0.72),
      mixto: wltp,
    };
  };

  const maxAuto = Math.max(...activeVehicles.map(v => Number(v.autonomia_km) || 0), 1);

  // Costo de recarga
  const PRECIO_KWH = 60;
  const PRECIO_GAS = 850;
  const KML = 12;
  const getCostos = (v: Vehicle) => {
    const kwh = Number(v.capacidad_bateria_kwh) || 0;
    const km = Number(v.autonomia_km) || 0;
    const electrico = Math.round(kwh * PRECIO_KWH);
    const litros = Math.round(km / KML);
    const gasolina = Math.round(litros * PRECIO_GAS);
    const ahorro = gasolina - electrico;
    return { electrico, gasolina, litros, kwh, ahorro };
  };

  const tabs = [
    { key: 'todas', label: 'Todas' },
    ...SPEC_GROUPS.map(g => ({ key: g.key, label: g.label })),
  ];

  const visibleSpecs = activeTab === 'todas'
    ? ALL_SPECS
    : ALL_SPECS.filter(s => s.group === activeTab);

  return (
    <div style={{ paddingTop: '96px', paddingBottom: '4rem', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ display:'inline-block', background:'rgba(2,79,125,0.1)', color:'#024f7d', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 1rem', borderRadius:'99px', marginBottom:'0.75rem' }}>Comparador</span>
          <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, color:'#071f37', marginBottom:'0.4rem' }}>Compara Vehículos Eléctricos</h1>
          <p style={{ color:'#64748b' }}>Selecciona hasta {MAX} vehículos para ver sus diferencias lado a lado</p>
        </div>

        {/* ── 3 RANURAS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap:'1.25rem', marginBottom:'2rem' }}>
          {[0,1,2].map(i => {
            const v = selected[i];
            const color = V_COLORS[i];
            const imgSrc = v?.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url)
              : v?.profile?.imagenes?.[0]?.url ? getImageUrl(v.profile.imagenes[0].url)
              : '/placeholder.png';
            return (
              <div key={i} style={{ background:'#fff', borderRadius:'18px', border: pickerSlot===i ? `2px solid ${color}` : v ? `2px solid ${color}` : '2px dashed #cbd5e1', overflow:'hidden', transition:'border-color 0.2s, box-shadow 0.2s', boxShadow: v ? `0 4px 20px ${V_COLORS_LIGHT[i]}` : '0 2px 8px rgba(0,0,0,0.04)', minHeight:'260px', display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'0.75rem 1rem 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, color: v ? color : '#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Vehículo {i+1}</span>
                  {v && <button onClick={() => clearSlot(i)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.2rem', lineHeight:1 }}>×</button>}
                </div>
                {v ? (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0.75rem 1rem 1rem' }}>
                    <div style={{ position:'relative', width:'100%', aspectRatio:'16/9', borderRadius:'10px', overflow:'hidden', marginBottom:'0.75rem', background:'#f1f5f9', borderLeft:`3px solid ${color}` }}>
                      <Image src={imgSrc} alt={v.modelo} fill className="object-cover" sizes="400px" />
                    </div>
                    <p style={{ fontSize:'0.85rem', fontWeight:700, color:'#071f37', textTransform:'uppercase', letterSpacing:'0.03em', marginBottom:'0.2rem' }}>{v.marca} {v.modelo}</p>
                    <p style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'0.4rem' }}>{v.año}</p>
                    <p style={{ fontSize:'1.05rem', fontWeight:800, color }}>{formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                    <button onClick={() => openPicker(i)} style={{ marginTop:'auto', paddingTop:'0.6rem', fontSize:'0.78rem', color:'#94a3b8', background:'none', border:'none', cursor:'pointer', textAlign:'left', textDecoration:'underline' }}>
                      Cambiar modelo
                    </button>
                  </div>
                ) : (
                  <button onClick={() => openPicker(i)}
                    style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.75rem', cursor:'pointer', background:'none', border:'none', padding:'1.5rem', color:'#94a3b8' }}>
                    <div style={{ width:'52px', height:'52px', borderRadius:'50%', background: pickerSlot===i ? V_COLORS_LIGHT[i] : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', color: pickerSlot===i ? color : '#cbd5e1', transition:'background 0.2s' }}>+</div>
                    <span style={{ fontSize:'0.88rem', fontWeight:600, color: pickerSlot===i ? color : '#94a3b8' }}>{pickerSlot===i ? 'Seleccionando...' : 'Agregar vehículo'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── PICKER ── */}
        {pickerSlot !== null && (
          <div ref={pickerRef} style={{ background:'#fff', borderRadius:'18px', border:`2px solid ${V_COLORS[pickerSlot]}`, padding:'1.5rem', marginBottom:'2rem', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <h3 style={{ fontWeight:700, color:'#071f37', fontSize:'0.95rem' }}>Seleccionando Vehículo {pickerSlot+1}</h3>
              <button onClick={() => { setPickerSlot(null); setSearch(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'1.3rem' }}>×</button>
            </div>
            <input type="text" placeholder="Buscar por marca o modelo..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'0.65rem 1rem', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'0.9rem', marginBottom:'1rem', outline:'none', color:'#071f37' }} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:'0.75rem', maxHeight:'320px', overflowY:'auto' }}>
              {filteredVehicles.map(v => {
                const already = selected.some(s => s?.id === v.id);
                const imgSrc = v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url)
                  : v.profile?.imagenes?.[0]?.url ? getImageUrl(v.profile.imagenes[0].url)
                  : '/placeholder.png';
                return (
                  <button key={v.id} onClick={() => !already && toggle(v, pickerSlot!)} disabled={already}
                    style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'12px', padding:'0.75rem', cursor:already?'not-allowed':'pointer', textAlign:'left', opacity:already?0.45:1, transition:'border-color 0.15s' }}
                    onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.borderColor='#024f7d'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#e2e8f0'; }}>
                    <div style={{ position:'relative', width:'100%', aspectRatio:'16/9', borderRadius:'8px', overflow:'hidden', marginBottom:'0.5rem', background:'#f1f5f9' }}>
                      <Image src={imgSrc} alt={v.modelo} fill className="object-cover" sizes="200px" />
                    </div>
                    <p style={{ fontSize:'0.78rem', fontWeight:700, color:'#071f37', textTransform:'uppercase' }}>{v.marca} {v.modelo}</p>
                    <p style={{ fontSize:'0.72rem', color:'#64748b' }}>{v.año} · {formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {count === 0 && (
          <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🚗</div>
            <p style={{ fontWeight:600 }}>Toca una ranura para elegir un vehículo</p>
          </div>
        )}
        {count === 1 && (
          <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>⚖️</div>
            <p style={{ fontWeight:600 }}>Selecciona al menos un vehículo más para comparar</p>
          </div>
        )}

        {count >= 2 && (
          <>
            {/* ── AUTONOMÍA REAL ESTIMADA ── */}
            <div style={{ background:'#fff', borderRadius:'18px', border:'1.5px solid #e2e8f0', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem' }}>
                <span style={{ fontSize:'1.6rem' }}>🗺️</span>
                <div>
                  <h2 style={{ fontWeight:800, color:'#071f37', fontSize:'1.05rem' }}>Autonomía Real Estimada</h2>
                  <p style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Basado en perfil de conducción mixto Costa Rica (WLTP oficial como referencia)</p>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap:'1.5rem' }}>
                {selected.map((v, vi) => v ? (() => {
                  const auto = getAutonomia(v);
                  const color = V_COLORS[vi];
                  return (
                    <div key={vi}>
                      <p style={{ fontSize:'0.85rem', fontWeight:800, color, textTransform:'uppercase', marginBottom:'1rem', letterSpacing:'0.04em' }}>{v.marca} {v.modelo}</p>
                      {[
                        { label:'🏙️ Ciudad', km: auto.ciudad },
                        { label:'🛣️ Autopista', km: auto.autopista },
                        { label:'🔄 Mixto (WLTP)', km: auto.mixto },
                      ].map(row => (
                        <div key={row.label} style={{ marginBottom:'0.9rem' }}>
                          <p style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:'0.3rem' }}>{row.label}</p>
                          <div style={{ height:'8px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden', marginBottom:'0.25rem' }}>
                            <div style={{ height:'100%', width:`${(row.km/maxAuto)*100}%`, background:color, borderRadius:'99px', transition:'width 0.6s ease' }} />
                          </div>
                          <p style={{ fontSize:'0.88rem', fontWeight:700, color:'#071f37' }}>{row.km} km</p>
                        </div>
                      ))}
                    </div>
                  );
                })() : null)}
              </div>
            </div>

            {/* ── COSTO DE RECARGA ── */}
            <div style={{ background:'#fff', borderRadius:'18px', border:'1.5px solid #e2e8f0', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem' }}>
                <span style={{ fontSize:'1.6rem' }}>💰</span>
                <div>
                  <h2 style={{ fontWeight:800, color:'#071f37', fontSize:'1.05rem' }}>Costo de Recarga Completa</h2>
                  <p style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Comparado con llenar el tanque de un auto a gasolina equivalente (₡{PRECIO_KWH}/kWh · ₡{PRECIO_GAS}/litro)</p>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap:'1.25rem' }}>
                {selected.map((v, vi) => v ? (() => {
                  const c = getCostos(v);
                  const color = V_COLORS[vi];
                  return (
                    <div key={vi} style={{ border:`1.5px solid ${V_COLORS_BORDER[vi]}`, borderRadius:'14px', padding:'1.25rem', borderLeft:`4px solid ${color}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                        <p style={{ fontSize:'0.85rem', fontWeight:800, color, textTransform:'uppercase' }}>{v.marca} {v.modelo}</p>
                        <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#64748b', background:'#f1f5f9', padding:'0.2rem 0.6rem', borderRadius:'99px' }}>{c.kwh} kWh</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'0.5rem', alignItems:'center', marginBottom:'0.75rem' }}>
                        <div>
                          <p style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'0.2rem' }}>⚡ Carga completa</p>
                          <p style={{ fontSize:'1.2rem', fontWeight:800, color:'#24a148' }}>{formatCRC(c.electrico)}</p>
                          <p style={{ fontSize:'0.7rem', color:'#94a3b8' }}>~{Number(v.autonomia_km).toFixed(2)} km de autonomía</p>
                        </div>
                        <span style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600 }}>vs</span>
                        <div>
                          <p style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'0.2rem' }}>🔴 Gasolina equivalente</p>
                          <p style={{ fontSize:'1.2rem', fontWeight:800, color:'#ef4444' }}>{formatCRC(c.gasolina)}</p>
                          <p style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{c.litros} litros estimados</p>
                        </div>
                      </div>
                      <div style={{ background:'rgba(36,161,72,0.08)', borderRadius:'8px', padding:'0.6rem 0.75rem', textAlign:'center' }}>
                        <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#24a148' }}>Ahorro estimado: {formatCRC(c.ahorro)} por carga</span>
                      </div>
                    </div>
                  );
                })() : null)}
              </div>
            </div>

            {/* ── ESPECIFICACIONES COMPLETAS ── */}
            <div style={{ background:'#fff', borderRadius:'18px', border:'1.5px solid #e2e8f0', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'1.25rem 1.75rem', borderBottom:'1.5px solid #e2e8f0' }}>
                <h2 style={{ fontWeight:800, color:'#071f37', fontSize:'1.1rem', marginBottom:'1rem' }}>📊 Especificaciones Completas</h2>
                {/* Tabs */}
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                      style={{ padding:'0.4rem 1rem', borderRadius:'99px', fontSize:'0.82rem', fontWeight:600, border:'1.5px solid', borderColor: activeTab===t.key ? '#024f7d' : '#e2e8f0', background: activeTab===t.key ? '#024f7d' : '#fff', color: activeTab===t.key ? '#fff' : '#64748b', cursor:'pointer', transition:'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', fontSize:'0.88rem', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'2px solid #e2e8f0', background:'#f8fafc' }}>
                      <th style={{ textAlign:'left', padding:'1rem 1.25rem', fontWeight:600, color:'#64748b', width:'180px', textTransform:'uppercase', fontSize:'0.72rem', letterSpacing:'0.08em', position:'sticky', left:0, background:'#f8fafc', zIndex:2, boxShadow:'2px 0 6px rgba(0,0,0,0.06)' }}>Característica</th>
                      {selected.map((v, i) => v ? (
                        <th key={i} style={{ padding:'1rem', textAlign:'center', minWidth:'180px', borderLeft:`3px solid ${V_COLORS[i]}` }}>
                          <div style={{ position:'relative', width:'60px', height:'40px', margin:'0 auto 0.4rem', borderRadius:'6px', overflow:'hidden' }}>
                            <Image src={v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url) : '/placeholder.png'} alt={v.modelo} fill className="object-cover" sizes="60px" />
                          </div>
                          <div style={{ fontWeight:800, color:V_COLORS[i], fontSize:'0.85rem' }}>{v.marca} {v.modelo}</div>
                          <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:400 }}>{formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}</div>
                        </th>
                      ) : null)}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'todas' && SPEC_GROUPS.map(group => (
                      <>
                        <tr key={`hdr-${group.key}`} style={{ background:'#071f37' }}>
                          <td style={{ padding:'0.6rem 1.25rem', fontSize:'0.75rem', fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.1em', position:'sticky', left:0, background:'#071f37', zIndex:1 }}>{group.label}</td>
                          {selected.map((v, i) => v ? <td key={i} style={{ background:'#071f37' }} /> : null)}
                        </tr>
                        {group.specs.map(({ label, key, unit }, rowIdx) => {
                          const best = getBest(key);
                          const rowBg = rowIdx%2===0 ? '#fff' : '#fafbfc';
                          return (
                            <tr key={key} style={{ borderBottom:'1px solid #f1f5f9', background: rowBg }}>
                              <td style={{ padding:'0.8rem 1.25rem', color:'#64748b', fontWeight:600, position:'sticky', left:0, background: rowBg, zIndex:1, boxShadow:'2px 0 6px rgba(0,0,0,0.04)' }}>{label}</td>
                              {selected.map((v, i) => {
                                if (!v) return null;
                                const val = getVal(v, key);
                                const isBest = best !== null && Number(val) === best;
                                const display = (key==='precio_venta_final'||key==='precio_venta') ? formatCRC(Number(v.precio_venta_final??v.precio_venta)) : val!=null ? `${val}${unit?' '+unit:''}` : '—';
                                return (
                                  <td key={i} style={{ padding:'0.8rem 1rem', textAlign:'center', fontWeight: isBest&&val ? 800 : 600, color: isBest&&val ? V_COLORS[i] : val ? '#071f37' : '#cbd5e1' }}>
                                    {display}{isBest&&val ? ' ⭐' : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    ))}
                    {activeTab !== 'todas' && visibleSpecs.map(({ label, key, unit }, rowIdx) => {
                      const best = getBest(key);
                      const rowBg2 = rowIdx%2===0 ? '#fff' : '#fafbfc';
                      return (
                        <tr key={key} style={{ borderBottom:'1px solid #f1f5f9', background: rowBg2 }}>
                          <td style={{ padding:'0.8rem 1.25rem', color:'#64748b', fontWeight:600, position:'sticky', left:0, background: rowBg2, zIndex:1, boxShadow:'2px 0 6px rgba(0,0,0,0.04)' }}>{label}</td>
                          {selected.map((v, i) => {
                            if (!v) return null;
                            const val = getVal(v, key);
                            const isBest = best !== null && Number(val) === best;
                            const display = (key==='precio_venta_final'||key==='precio_venta') ? formatCRC(Number(v.precio_venta_final??v.precio_venta)) : val!=null ? `${val}${unit?' '+unit:''}` : '—';
                            return (
                              <td key={i} style={{ padding:'0.8rem 1rem', textAlign:'center', fontWeight: isBest&&val ? 800 : 600, color: isBest&&val ? V_COLORS[i] : val ? '#071f37' : '#cbd5e1' }}>
                                {display}{isBest&&val ? ' ⭐' : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Ver ficha */}
                    <tr style={{ background:'#f8fafc' }}>
                      <td style={{ padding:'1rem 1.25rem', color:'#64748b', fontWeight:600, position:'sticky', left:0, background:'#f8fafc', zIndex:1, boxShadow:'2px 0 6px rgba(0,0,0,0.04)' }}>Ficha técnica</td>
                      {selected.map((v, i) => v ? (
                        <td key={i} style={{ padding:'1rem', textAlign:'center' }}>
                          <Link href={`/catalog/${v.id}`}
                            style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', background:V_COLORS[i], color:'#fff', fontWeight:700, fontSize:'0.85rem', padding:'0.55rem 1.2rem', borderRadius:'8px', textDecoration:'none' }}
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
          </>
        )}
      </div>
    </div>
  );
}
