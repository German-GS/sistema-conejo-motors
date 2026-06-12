'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, formatCRC, API } from '@/lib/api';
import type { Vehicle } from '@/types';

const BRAND = { navy: '#024f7d', teal: '#04c7b2', dark: '#071f37', mid: '#082d4b', light: '#45a5ce' };

function SpecItem({ label, value, unit = '' }: { label: string; value?: string | number | null; unit?: string }) {
  if (!value) return null;
  return (
    <li style={{ background:'#f8fafc', borderRadius:'12px', padding:'1rem 1.1rem', display:'flex', flexDirection:'column', gap:'0.25rem', border:'1px solid #e8eef5' }}>
      <strong style={{ fontSize:'0.68rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</strong>
      <span style={{ fontSize:'1rem', fontWeight:700, color:'#071f37' }}>{value} {unit}</span>
    </li>
  );
}

function FeatureList({ title, features }: { title: string; features?: string[] }) {
  if (!features?.length) return null;
  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <h4 style={{ fontWeight:700, color:'#071f37', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.9rem' }}>
        <span style={{ width:'3px', height:'18px', background: BRAND.teal, borderRadius:'99px', display:'inline-block' }} />
        {title}
      </h4>
      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        {features.map((f, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', fontSize:'0.875rem', color:'#475569' }}>
            <span style={{ color: BRAND.teal, marginTop:'1px', flexShrink:0 }}>✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Calculadora de financiamiento
function LoanCalc({ precioBase }: { precioBase: number }) {
  const [inicial, setInicial] = useState(Math.round(precioBase * 0.2));
  const [plazo, setPlazo] = useState(48);
  const [tasa, setTasa] = useState(12);

  const monto = precioBase - inicial;
  const tasaMes = tasa / 100 / 12;
  const cuota = tasaMes > 0
    ? Math.round(monto * (tasaMes * Math.pow(1 + tasaMes, plazo)) / (Math.pow(1 + tasaMes, plazo) - 1))
    : Math.round(monto / plazo);
  const totalPagar = cuota * plazo;

  return (
    <div style={{ background:`linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.mid} 100%)`, borderRadius:'18px', padding:'2rem', marginBottom:'2.5rem' }}>
      <h3 style={{ fontWeight:800, color:'#fff', marginBottom:'1.5rem', fontSize:'1.05rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
        💳 Calculadora de Financiamiento
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Prima inicial</label>
          <input type="number" value={inicial} step={500000}
            onChange={e => setInicial(Number(e.target.value))}
            style={{ width:'100%', padding:'0.7rem 1rem', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.95rem', outline:'none' }} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Plazo</label>
          <select value={plazo} onChange={e => setPlazo(Number(e.target.value))}
            style={{ width:'100%', padding:'0.7rem 1rem', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.95rem', outline:'none', cursor:'pointer' }}>
            {[12,24,36,48,60,72,84].map(p => <option key={p} value={p} style={{ background:'#082d4b' }}>{p} meses</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Tasa anual (%)</label>
          <input type="number" value={tasa} min={1} max={30} step={0.5}
            onChange={e => setTasa(Number(e.target.value))}
            style={{ width:'100%', padding:'0.7rem 1rem', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.95rem', outline:'none' }} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap:'0.75rem' }}>
        <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'1rem', textAlign:'center' }}>
          <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Monto a financiar</p>
          <p style={{ fontWeight:700, color:'#fff', fontSize:'0.95rem' }}>{formatCRC(monto)}</p>
        </div>
        <div style={{ background: BRAND.teal, borderRadius:'12px', padding:'1rem', textAlign:'center', boxShadow:`0 4px 20px rgba(4,199,178,0.35)` }}>
          <p style={{ fontSize:'0.72rem', color:'rgba(7,31,55,0.7)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>Cuota mensual</p>
          <p style={{ fontWeight:900, color:'#071f37', fontSize:'1.2rem' }}>{formatCRC(cuota)}</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'1rem', textAlign:'center' }}>
          <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>Total a pagar</p>
          <p style={{ fontWeight:700, color:'#fff', fontSize:'0.95rem' }}>{formatCRC(totalPagar)}</p>
        </div>
      </div>
      <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', marginTop:'1rem' }}>* Cálculo estimado. Las condiciones reales pueden variar según la entidad financiera.</p>
    </div>
  );
}

export function VehicleDetailClient({ vehicle }: { vehicle: Vehicle }) {
  const [activeTab, setActiveTab] = useState('rendimiento');
  const [activeImg, setActiveImg] = useState(0);
  const [lead, setLead] = useState({ nombre: '', email: '', telefono: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const images = vehicle.imagenes?.length
    ? vehicle.imagenes
    : vehicle.profile?.imagenes?.map(img => img) || [];

  const imgSrc = (i: number) => images[i]?.url ? getImageUrl(images[i].url) : '/placeholder.png';
  const vehicleName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.año ?? ''}`.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, vehiculoId: vehicle.id }),
      });
      setSent(true);
      setLead({ nombre: '', email: '', telefono: '' });
    } catch {
      alert('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const TABS = [
    { id: 'rendimiento', label: '⚡ Rendimiento' },
    { id: 'dimensiones', label: '📐 Dimensiones' },
    { id: 'equipamiento', label: '🛡️ Equipamiento' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px clamp(1rem, 4vw, 2rem) 4rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize:'0.875rem', color:'#94a3b8', marginBottom:'1.75rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <Link href="/" style={{ color:'#64748b', transition:'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color=BRAND.teal)}
          onMouseLeave={e => (e.currentTarget.style.color='#64748b')}>Inicio</Link>
        <span>›</span>
        <Link href="/catalog" style={{ color:'#64748b', transition:'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color=BRAND.teal)}
          onMouseLeave={e => (e.currentTarget.style.color='#64748b')}>Catálogo</Link>
        <span>›</span>
        <span style={{ color:'#071f37', fontWeight:600 }}>{vehicleName}</span>
      </nav>

      {/* HERO — galería + info */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap:'2.5rem', marginBottom:'2.5rem' }}>
        {/* Galería */}
        <div>
          <div style={{ position:'relative', aspectRatio:'4/3', borderRadius:'18px', overflow:'hidden', background:'#f1f5f9', marginBottom:'0.75rem' }}>
            {images.length > 0 ? (
              <Image src={imgSrc(activeImg)} alt={`${vehicleName} — vista ${activeImg + 1}`}
                fill className="object-cover" priority sizes="(max-width:1024px) 100vw, 50vw" />
            ) : (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem', color:'#cbd5e1' }}>🚗</div>
            )}
            {vehicle.visibilidad === 'Agotado' && (
              <div className="badge-agotado">📦 Agotado</div>
            )}
            {vehicle.visibilidad === 'Contrapedido' && (
              <div className="badge-pedido">🔄 Disponible Bajo Pedido</div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display:'flex', gap:'0.5rem', overflowX:'auto', paddingBottom:'4px' }}>
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  style={{ position:'relative', width:'64px', height:'48px', borderRadius:'8px', overflow:'hidden', flexShrink:0, border:`2px solid ${i===activeImg ? BRAND.teal : 'transparent'}`, transition:'border-color 0.15s', cursor:'pointer' }}>
                  <Image src={getImageUrl(img.url)} alt={`Vista ${i + 1}`} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info + formulario */}
        <div>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', marginBottom:'1rem' }}>
            <h1 style={{ fontSize:'clamp(1.4rem, 3vw, 1.9rem)', fontWeight:900, color:'#071f37', lineHeight:1.2 }}>{vehicleName}</h1>
            {vehicle.color && (
              <span style={{ flexShrink:0, fontSize:'0.82rem', background:'#f1f5f9', color:'#64748b', padding:'0.3rem 0.75rem', borderRadius:'99px' }}>🎨 {vehicle.color}</span>
            )}
          </div>

          {/* Key specs */}
          {(vehicle.autonomia_km || vehicle.aceleracion_0_100 || vehicle.potencia_hp || vehicle.capacidad_bateria_kwh) && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(80px, 1fr))', gap:'0.6rem', marginBottom:'1.5rem' }}>
              {vehicle.autonomia_km && (
                <div style={{ textAlign:'center', background:'#f8fafc', borderRadius:'12px', padding:'0.75rem 0.5rem', border:'1px solid #e8eef5' }}>
                  <div style={{ fontSize:'1.3rem', marginBottom:'0.25rem' }}>🛣️</div>
                  <div style={{ fontWeight:800, color:'#071f37', fontSize:'0.95rem' }}>{vehicle.autonomia_km} km</div>
                  <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>Autonomía</div>
                </div>
              )}
              {vehicle.aceleracion_0_100 && (
                <div style={{ textAlign:'center', background:'#f8fafc', borderRadius:'12px', padding:'0.75rem 0.5rem', border:'1px solid #e8eef5' }}>
                  <div style={{ fontSize:'1.3rem', marginBottom:'0.25rem' }}>⚡</div>
                  <div style={{ fontWeight:800, color:'#071f37', fontSize:'0.95rem' }}>{vehicle.aceleracion_0_100} s</div>
                  <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>0-100 km/h</div>
                </div>
              )}
              {vehicle.potencia_hp && (
                <div style={{ textAlign:'center', background:'#f8fafc', borderRadius:'12px', padding:'0.75rem 0.5rem', border:'1px solid #e8eef5' }}>
                  <div style={{ fontSize:'1.3rem', marginBottom:'0.25rem' }}>🏎️</div>
                  <div style={{ fontWeight:800, color:'#071f37', fontSize:'0.95rem' }}>{vehicle.potencia_hp} HP</div>
                  <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>Potencia</div>
                </div>
              )}
              {vehicle.capacidad_bateria_kwh && (
                <div style={{ textAlign:'center', background:'#f8fafc', borderRadius:'12px', padding:'0.75rem 0.5rem', border:'1px solid #e8eef5' }}>
                  <div style={{ fontSize:'1.3rem', marginBottom:'0.25rem' }}>🔋</div>
                  <div style={{ fontWeight:800, color:'#071f37', fontSize:'0.95rem' }}>{vehicle.capacidad_bateria_kwh} kWh</div>
                  <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>Batería</div>
                </div>
              )}
            </div>
          )}

          {/* Precio */}
          <div style={{ marginBottom:'1.5rem' }}>
            <p style={{ fontSize:'2rem', fontWeight:900, color: BRAND.navy }}>
              {formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
              {vehicle.precio_venta_usd && (
                <span style={{ fontSize:'0.7em', color:'#64748b', marginLeft:'0.75rem', fontWeight:500 }}>
                  / ${Number(vehicle.precio_venta_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                </span>
              )}
            </p>
            {vehicle.precio_venta_final && vehicle.precio_venta_final < vehicle.precio_venta && (
              <p style={{ fontSize:'0.875rem', color:'#94a3b8', textDecoration:'line-through' }}>{formatCRC(Number(vehicle.precio_venta))}</p>
            )}
          </div>

          {/* Acciones rápidas */}
          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.75rem', flexWrap:'wrap' }}>
            <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20el%20${encodeURIComponent(vehicleName)}`}
              target="_blank" rel="noreferrer"
              style={{ flex:1, minWidth:'140px', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'#25D366', color:'#fff', fontWeight:700, fontSize:'0.9rem', padding:'0.8rem 1.25rem', borderRadius:'12px', textDecoration:'none', transition:'opacity 0.2s' }}
              className="hover:opacity-90">
              💬 Cotizar por WhatsApp
            </a>
            <Link href="/compare"
              style={{ flex:1, minWidth:'140px', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'transparent', color: BRAND.navy, fontWeight:700, fontSize:'0.9rem', padding:'0.8rem 1.25rem', borderRadius:'12px', border:`2px solid ${BRAND.navy}`, textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background=BRAND.navy; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=BRAND.navy; }}>
              ⚖️ Comparar
            </Link>
          </div>

          {/* Formulario de contacto */}
          <div style={{ background:'#f8fafc', borderRadius:'16px', padding:'1.5rem', border:'1px solid #e8eef5' }}>
            <h3 style={{ fontWeight:700, color:'#071f37', marginBottom:'1.1rem', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <span style={{ width:'3px', height:'16px', background: BRAND.teal, borderRadius:'99px', display:'inline-block' }} />
              Solicitar información
            </h3>
            {sent ? (
              <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
                <p style={{ fontWeight:600, color:'#071f37' }}>¡Gracias! Un asesor te contactará pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <input name="nombre" value={lead.nombre} onChange={e => setLead({ ...lead, nombre: e.target.value })}
                  placeholder="Nombre completo" required className="form-input" />
                <input name="email" type="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })}
                  placeholder="Correo electrónico" required className="form-input" />
                <input name="telefono" value={lead.telefono} onChange={e => setLead({ ...lead, telefono: e.target.value })}
                  placeholder="Teléfono (opcional)" className="form-input" />
                <button type="submit" disabled={sending}
                  style={{ width:'100%', padding:'0.85rem', borderRadius:'12px', background: BRAND.navy, color:'#fff', fontWeight:700, fontSize:'0.95rem', border:'none', cursor:'pointer', opacity: sending ? 0.7 : 1, transition:'opacity 0.2s' }}>
                  {sending ? 'Enviando...' : 'Solicitar Información'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Calculadora financiamiento */}
      <LoanCalc precioBase={Number(vehicle.precio_venta)} />

      {/* Tabs de especificaciones */}
      <div style={{ marginBottom:'2.5rem' }}>
        <div style={{ display:'flex', gap:'0.25rem', borderBottom:`2px solid #e2e8f0`, marginBottom:'1.5rem' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:'0.75rem 1.25rem', fontSize:'0.875rem', fontWeight:600, border:'none', background:'none', cursor:'pointer', color: activeTab===t.id ? BRAND.teal : '#64748b', borderBottom: activeTab===t.id ? `2px solid ${BRAND.teal}` : '2px solid transparent', marginBottom:'-2px', transition:'color 0.15s, border-color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'rendimiento' && (
            <ul style={{ listStyle:'none', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
              <SpecItem label="Potencia" value={vehicle.potencia_hp} unit="HP" />
              <SpecItem label="Torque" value={vehicle.torque_nm} unit="Nm" />
              <SpecItem label="Aceleración 0–100 km/h" value={vehicle.aceleracion_0_100} unit="s" />
              <SpecItem label="Velocidad Máxima" value={vehicle.velocidad_maxima} unit="km/h" />
              <SpecItem label="Tracción" value={vehicle.traccion} />
              <SpecItem label="Autonomía" value={vehicle.autonomia_km} unit="km" />
              <SpecItem label="Batería" value={vehicle.capacidad_bateria_kwh} unit="kWh" />
              <SpecItem label="Carga Rápida DC" value={vehicle.tiempo_carga_dc} unit="min" />
              <SpecItem label="Carga Lenta AC" value={vehicle.tiempo_carga_ac} unit="horas" />
              <SpecItem label="Pasajeros" value={vehicle.numero_pasajeros} />
            </ul>
          )}
          {activeTab === 'dimensiones' && (
            <ul style={{ listStyle:'none', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
              <SpecItem label="Largo" value={vehicle.largo_mm} unit="mm" />
              <SpecItem label="Ancho" value={vehicle.ancho_mm} unit="mm" />
              <SpecItem label="Alto" value={vehicle.alto_mm} unit="mm" />
              <SpecItem label="Distancia entre Ejes" value={vehicle.distancia_ejes_mm} unit="mm" />
              <SpecItem label="Peso" value={vehicle.peso_kg} unit="kg" />
              <SpecItem label="Maletero" value={vehicle.capacidad_maletero_l} unit="L" />
            </ul>
          )}
          {activeTab === 'equipamiento' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'1.5rem' }}>
              <FeatureList title="Seguridad" features={vehicle.seguridad} />
              <FeatureList title="Interior" features={vehicle.interior} />
              <FeatureList title="Exterior" features={vehicle.exterior} />
              <FeatureList title="Tecnología" features={vehicle.tecnologia} />
            </div>
          )}
        </div>
      </div>

      {/* CTA final */}
      <div style={{ background:`linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.mid} 60%, ${BRAND.navy} 100%)`, borderRadius:'18px', padding:'2.5rem 2rem', color:'#fff', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-60px', right:0, width:'240px', height:'240px', borderRadius:'50%', background:'rgba(4,199,178,0.07)', pointerEvents:'none' }} />
        <h2 style={{ fontSize:'clamp(1.2rem, 3vw, 1.6rem)', fontWeight:900, marginBottom:'0.5rem' }}>¿Listo para dar el salto a eléctrico?</h2>
        <p style={{ color:'rgba(255,255,255,0.65)', marginBottom:'1.75rem' }}>Agenda una prueba de manejo sin compromiso.</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', justifyContent:'center' }}>
          <a href={`https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20una%20prueba%20del%20${encodeURIComponent(vehicleName)}`}
            target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'#25D366', color:'#fff', fontWeight:700, padding:'0.85rem 1.75rem', borderRadius:'12px', textDecoration:'none', transition:'opacity 0.2s' }}
            className="hover:opacity-90">
            📅 Agendar Test Drive
          </a>
          <Link href="/catalog"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'transparent', color:'#fff', fontWeight:700, padding:'0.85rem 1.75rem', borderRadius:'12px', border:'2px solid rgba(255,255,255,0.45)', textDecoration:'none', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.45)'; }}>
            Ver más modelos
          </Link>
        </div>
      </div>
    </div>
  );
}
