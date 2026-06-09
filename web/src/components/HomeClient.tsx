'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl, formatCRC } from '@/lib/api';
import type { Vehicle, CarouselSlide } from '@/types';

interface Props {
  slides: CarouselSlide[];
  featuredVehicles: Vehicle[];
}

// ── Calculadora de ahorro ──────────────────────────────────────────────────
function SavingsCalculator() {
  const [km, setKm] = useState(1200);
  const [precioGas, setPrecioGas] = useState(850);
  const [rendimiento, setRendimiento] = useState(12);
  const [precioKwh, setPrecioKwh] = useState(60);
  const [consumoElec, setConsumoElec] = useState(15);

  const costoGas  = Math.round((km / rendimiento) * precioGas);
  const costoElec = Math.round((km / 100) * consumoElec * precioKwh);
  const ahorroMes = Math.max(0, costoGas - costoElec);
  const ahorroAno = ahorroMes * 12;

  return (
    <section style={{ background: 'linear-gradient(135deg, #071f37 0%, #082d4b 50%, #024f7d 100%)', padding: '5rem clamp(1rem,4vw,1.5rem)', position: 'relative', overflow: 'hidden' }}>
      {/* Círculos decorativos — borde derecho e izquierdo dentro del contenedor */}
      <div style={{ position:'absolute', top:'-80px', right:0, width:'320px', height:'320px', borderRadius:'50%', background:'rgba(4,199,178,0.06)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-60px', left:0, width:'260px', height:'260px', borderRadius:'50%', background:'rgba(69,165,206,0.07)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap:'2.5rem', alignItems:'center' }}>
          <div>
            <span style={{ display:'inline-block', background:'rgba(4,199,178,0.15)', color:'#04c7b2', fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.3rem 0.9rem', borderRadius:'99px', marginBottom:'0.75rem' }}>Herramienta interactiva</span>
            <h2 style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:800, color:'#fff', marginBottom:'0.5rem' }}>¿Cuánto ahorrarías al pasarte a eléctrico?</h2>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'1rem', maxWidth:'480px', marginBottom:'1.5rem' }}>
              Ajusta los valores según tu consumo real y ve el ahorro estimado en colones.
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color:'rgba(255,255,255,0.8)' }}>
                  Km por mes: <span style={{ color:'#04c7b2', fontWeight:700 }}>{km.toLocaleString('es-CR')} km</span>
                </label>
                <input type="range" min={300} max={5000} step={100} value={km}
                  onChange={e => setKm(Number(e.target.value))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:'1rem' }}>
                {[
                  { label:'Precio gasolina (₡/litro)', val:precioGas, set:setPrecioGas, min:400, max:2000 },
                  { label:'Rendimiento (km/litro)', val:rendimiento, set:setRendimiento, min:5, max:30 },
                  { label:'Precio electricidad (₡/kWh)', val:precioKwh, set:setPrecioKwh, min:50, max:500 },
                  { label:'Consumo eléctrico (kWh/100km)', val:consumoElec, set:setConsumoElec, min:5, max:40 },
                ].map(({ label, val, set, min, max }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold mb-1" style={{ color:'rgba(255,255,255,0.6)' }}>{label}</label>
                    <input type="number" value={val} min={min} max={max}
                      onChange={e => set(Number(e.target.value))}
                      style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', borderRadius:'10px', padding:'0.6rem 1rem', width:'100%', outline:'none' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'clamp(1.25rem, 4vw, 2rem)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'16px', padding:'1.5rem 1rem', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.6rem' }}>⛽</div>
                <div style={{ fontSize:'0.73rem', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.5rem' }}>Con gasolina / mes</div>
                <div style={{ fontSize:'clamp(1.1rem,3vw,1.4rem)', fontWeight:800, color:'#fff' }}>{formatCRC(costoGas)}</div>
              </div>
              <div style={{ background:'rgba(4,199,178,0.12)', border:'1px solid rgba(4,199,178,0.3)', borderRadius:'16px', padding:'1.5rem 1rem', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.6rem' }}>⚡</div>
                <div style={{ fontSize:'0.73rem', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:'0.5rem' }}>Con eléctrico / mes</div>
                <div style={{ fontSize:'clamp(1.1rem,3vw,1.4rem)', fontWeight:800, color:'#04c7b2' }}>{formatCRC(costoElec)}</div>
              </div>
            </div>
            <div style={{ background:'rgba(4,199,178,0.1)', border:'1px solid rgba(4,199,178,0.25)', borderRadius:'16px', padding:'1.5rem', textAlign:'center', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.12em', color:'#04c7b2', textTransform:'uppercase', marginBottom:'0.6rem' }}>Ahorro estimado</p>
              <p style={{ fontSize:'clamp(2rem,6vw,2.8rem)', fontWeight:900, color:'#fff', lineHeight:1, marginBottom:'0.4rem' }}>{formatCRC(ahorroMes)}<span style={{ fontSize:'1rem', fontWeight:400, color:'rgba(255,255,255,0.5)' }}> /mes</span></p>
              <p style={{ fontSize:'1rem', fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{formatCRC(ahorroAno)} al año</p>
            </div>
            <Link href="/catalog"
              style={{ display:'block', textAlign:'center', background:'#04c7b2', color:'#071f37', fontWeight:700, padding:'0.85rem 1.5rem', borderRadius:'12px', fontSize:'0.95rem', transition:'opacity 0.2s' }}
              className="hover:opacity-90">
              Ver vehículos eléctricos →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────
const STATS = [
  { icon: '⚡', value: '100%', label: 'Modelos eléctricos' },
  { icon: '🔋', value: '3,000 ciclos', label: 'Garantía Batería BYD' },
  { icon: '🚗', value: 'Entrega', label: 'En todo Costa Rica' },
  { icon: '💬', value: 'Asesoría', label: 'Personalizada sin costo' },
];

function StatsBar() {
  return (
    <div className="bg-[#1a1a2e] py-8">
      <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center text-white">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sección electro ────────────────────────────────────────────────────────
function ElectroSection() {
  const items = [
    { icon: '💰', title: 'Ahorro en combustible', desc: 'Reduce hasta un 80% tus gastos en combustible comparado con vehículos de gasolina.' },
    { icon: '🌱', title: 'Cero emisiones', desc: 'Contribuye al ambiente con un vehículo que no produce emisiones directas de CO₂.' },
    { icon: '🔧', title: 'Menos mantenimiento', desc: 'Sin aceite, filtros ni bujías. Los eléctricos tienen hasta 60% menos costos de mantenimiento.' },
    { icon: '⚡', title: 'Carga en casa', desc: 'Carga tu vehículo mientras duermes con un enchufe doméstico o cargador instalado en tu hogar.' },
    { icon: '🏎️', title: 'Alto rendimiento', desc: 'Torque instantáneo para una aceleración suave y poderosa desde el primer momento.' },
    { icon: '🛡️', title: 'Garantía extendida', desc: 'Nuestras baterías BYD Blade tienen garantía de hasta 3,000 ciclos de carga.' },
  ];
  return (
    <section className="section section--gray">
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 clamp(1rem,4vw,1.5rem)' }}>
        <div className="section-header">
          <span className="section-tag">¿Por qué eléctrico?</span>
          <h2 className="section-title mt-2">Ventajas de la electromovilidad</h2>
          <p className="section-sub mt-2">Descubre por qué cada vez más costarricenses eligen vehículos eléctricos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} style={{ background:'#fff', borderRadius:'18px', padding:'2rem 1.75rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #e8eef5', transition:'transform 0.2s, box-shadow 0.2s', cursor:'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 8px 28px rgba(2,79,125,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'1.1rem', display:'block' }}>{item.icon}</div>
              <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#071f37', marginBottom:'0.6rem' }}>{item.title}</h3>
              <p style={{ fontSize:'0.9rem', color:'#64748b', lineHeight:1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Contacto ───────────────────────────────────────────────────────────────
function ContactSection() {
  const socials = [
    { href: 'https://www.instagram.com/conejomotors', label: 'Instagram', hoverBg: 'radial-gradient(circle at 30% 110%, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { href: 'https://www.facebook.com/profile.php?id=61590859552347', label: 'Facebook', hoverBg: '#1877F2', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { href: 'https://wa.me/50672071157', label: 'WhatsApp', hoverBg: '#25D366', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { href: 'https://www.tiktok.com/@conejomotors', label: 'TikTok', hoverBg: '#010101', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg> },
  ];
  return (
    <section id="contacto" style={{ background:'#071f37', padding:'4rem clamp(1rem,4vw,1.5rem)', color:'#fff' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap:'2.5rem', alignItems:'stretch' }}>
          {/* Info */}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ display:'inline-block', background:'rgba(4,199,178,0.15)', color:'#04c7b2', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 0.9rem', borderRadius:'99px', marginBottom:'0.75rem', alignSelf:'flex-start' }}>
              Estamos aquí para ayudarte
            </span>
            <h2 style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, color:'#fff', marginBottom:'0.5rem' }}>Contáctanos</h2>
            <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:'1.75rem', fontSize:'0.95rem', lineHeight:1.6 }}>
              Nuestro equipo de asesores te ayuda a encontrar el vehículo ideal para tu estilo de vida.
            </p>
            <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1.75rem' }}>
              {[
                { icon: '📧', label: 'ventas@conejomotors.com', href: 'mailto:ventas@conejomotors.com' },
                { icon: '📞', label: '7207-1157', href: 'tel:+50672071157' },
                { icon: '🕐', label: 'Lun–Vie 9am–6pm · Sáb 9am–1pm', href: null },
                { icon: '📍', label: 'Güachipelín de Escazú, San José, Costa Rica', href: null },
              ].map((item, i) => (
                <li key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', color:'rgba(255,255,255,0.75)', fontSize:'0.95rem' }}>
                  <span style={{ fontSize:'1.2rem', width:'24px', textAlign:'center' }}>{item.icon}</span>
                  {item.href
                    ? <a href={item.href} style={{ color:'rgba(255,255,255,0.75)', transition:'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color='#04c7b2')}
                        onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.75)')}>{item.label}</a>
                    : <span>{item.label}</span>
                  }
                </li>
              ))}
            </ul>
            <p style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'0.7rem' }}>Síguenos</p>
            <div style={{ display:'flex', gap:'0.6rem' }}>
              {socials.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', transition:'background 0.2s, transform 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = s.hoverBg; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          {/* Mapa — alineado con el tope del texto */}
          <div style={{ borderRadius:'16px', overflow:'hidden', minHeight:'360px', height:'100%' }}>
            <iframe
              title="Ubicación Conejo Motors — Güachipelín Escazú"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.76!2d-84.14305!3d9.93891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa0fef2b94bcfd3%3A0x6e42d5c5d3d2bdf5!2sG%C3%BCachipel%C3%ADn%2C+Escaz%C3%BA%2C+San+Jos%C3%A9%2C+Costa+Rica!5e0!3m2!1ses!2scr!4v1"
              width="100%" height="100%" style={{ border:0, display:'block', minHeight:'360px' }}
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function HomeClient({ slides, featuredVehicles }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (idx: number) => setCurrentSlide((idx + slides.length) % slides.length);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (slides.length > 1)
      timerRef.current = setTimeout(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, slides.length]);

  return (
    <>
      {/* ── CARRUSEL ── */}
      {slides.length > 0 && (
        <div style={{ position:'relative', height:'calc(100vh - 68px)', minHeight:'520px', overflow:'hidden' }}>
          {slides.map((slide, i) => (
            <div key={i}
              style={{ position:'absolute', inset:0, transition:'opacity 0.7s', opacity: i===currentSlide ? 1 : 0, pointerEvents: i===currentSlide ? 'auto' : 'none' }}>
              {slide.imageUrl && slide.mediaType === 'video' ? (
                <video
                  src={getImageUrl(slide.imageUrl)}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  autoPlay muted loop playsInline
                />
              ) : slide.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getImageUrl(slide.imageUrl)} alt={slide.title}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  loading={i === 0 ? 'eager' : 'lazy'} />
              ) : null}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
              <div style={{ position:'relative', zIndex:10, height:'100%', display:'flex', alignItems:'flex-end', paddingBottom:'clamp(3rem,8vh,5rem)' }}>
                <div style={{ maxWidth:'1200px', margin:'0 auto', width:'100%', padding:'0 clamp(1.25rem,5vw,3rem)' }}>
                  <p style={{ color:'#04c7b2', fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
                    Movilidad Eléctrica · Costa Rica
                  </p>
                  <h1 style={{ fontSize:'clamp(1.8rem,5vw,3.5rem)', fontWeight:900, color:'#fff', lineHeight:1.15, marginBottom:'0.75rem', maxWidth:'600px' }}>
                    {slide.title}
                  </h1>
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'clamp(0.95rem,2vw,1.15rem)', marginBottom:'1.75rem', maxWidth:'480px' }}>{slide.subtitle}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem' }}>
                    <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
                      target="_blank" rel="noreferrer" className="btn-primary">
                      Solicitar Cotización
                    </a>
                    <Link href="/catalog" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.75rem 1.75rem', background:'transparent', color:'#fff', fontWeight:600, fontSize:'0.95rem', borderRadius:'12px', border:'2px solid rgba(255,255,255,0.6)', textDecoration:'none' }}>
                      Ver Catálogo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {slides.length > 1 && (
            <>
              <button onClick={() => { goTo(currentSlide - 1); resetTimer(); }}
                style={{ position:'absolute', left:'clamp(0.75rem,2vw,1.25rem)', top:'50%', transform:'translateY(-50%)', zIndex:20, width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(4px)', color:'#fff', fontSize:'1.3rem', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                aria-label="Anterior">‹</button>
              <button onClick={() => { goTo(currentSlide + 1); resetTimer(); }}
                style={{ position:'absolute', right:'clamp(0.75rem,2vw,1.25rem)', top:'50%', transform:'translateY(-50%)', zIndex:20, width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(4px)', color:'#fff', fontSize:'1.3rem', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                aria-label="Siguiente">›</button>
              <div style={{ position:'absolute', bottom:'clamp(1rem,3vh,1.5rem)', left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', gap:'0.5rem' }}>
                {slides.map((_, i) => (
                  <button key={i} onClick={() => { goTo(i); resetTimer(); }}
                    style={{ height:'8px', width: i===currentSlide ? '24px' : '8px', borderRadius:'99px', background: i===currentSlide ? '#fff' : 'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', transition:'all 0.3s', padding:0 }}
                    aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STATS ── */}
      <StatsBar />

      {/* ── VEHÍCULOS DESTACADOS ── */}
      {featuredVehicles.length > 0 && (
        <section className="section">
          <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 clamp(1rem,4vw,1.5rem)' }}>
            <div className="section-header">
              <span className="section-tag">Selección del mes</span>
              <h2 className="section-title mt-2">Vehículos Destacados</h2>
              <p className="section-sub mt-2">Modelos disponibles ahora en nuestro concesionario en Escazú</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap:'1.5rem' }}>
              {featuredVehicles.map(vehicle => {
                const imgSrc = vehicle.imagenes?.[0]?.url
                  ? getImageUrl(vehicle.imagenes[0].url)
                  : vehicle.profile?.imagenes?.[0]?.url
                  ? getImageUrl(vehicle.profile.imagenes[0].url)
                  : '/placeholder.png';
                return (
                  <div key={vehicle.id} className="vehicle-card">
                    <div className="vehicle-card__img">
                      <Image src={imgSrc} alt={`${vehicle.marca} ${vehicle.modelo}`}
                        fill className="object-cover transition-transform duration-400" sizes="(max-width:640px) 100vw, 33vw" />
                    </div>
                    <div className="vehicle-card__body">
                      <h3 className="vehicle-card__name">{vehicle.marca} {vehicle.modelo} ({vehicle.año})</h3>
                      <p className="vehicle-card__price">{formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}</p>
                      {vehicle.autonomia_km && (
                        <div className="vehicle-card__specs"><span>🛣️ {vehicle.autonomia_km} km</span></div>
                      )}
                      <div className="vehicle-card__actions">
                        <Link href={`/catalog/${vehicle.id}`}
                          style={{ flex:1, textAlign:'center', background:'#024f7d', color:'#fff', fontWeight:700, fontSize:'0.88rem', padding:'0.6rem 1rem', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                          className="hover:opacity-90">
                          Ver este modelo
                        </Link>
                        <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20el%20${encodeURIComponent(`${vehicle.marca} ${vehicle.modelo} ${vehicle.año}`)}`}
                          target="_blank" rel="noreferrer"
                          style={{ flex:1, textAlign:'center', background:'transparent', color:'#024f7d', fontWeight:600, fontSize:'0.88rem', padding:'0.6rem 1rem', borderRadius:'10px', border:'2px solid #024f7d', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#024f7d'; e.currentTarget.style.color='#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#024f7d'; }}>
                          Consultar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <Link href="/catalog"
                style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.85rem 2.25rem', borderRadius:'12px', border:'2px solid #024f7d', color:'#024f7d', fontWeight:700, fontSize:'0.95rem', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#024f7d'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#024f7d'; }}>
                Ver catálogo completo →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CALCULADORA ── */}
      <SavingsCalculator />

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #071f37 0%, #082d4b 60%, #024f7d 100%)', padding: '6rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorativos — borde derecho dentro del contenedor, overflow vertical clipado por la sección */}
        <div style={{ position:'absolute', top:'-80px', left:'50%', width:'min(500px, 100%)', height:'min(500px, 100vw)', borderRadius:'50%', background:'rgba(4,199,178,0.05)', pointerEvents:'none', transform:'translateX(-50%)' }} />
        <div style={{ position:'absolute', bottom:'-80px', right:0, width:'280px', height:'280px', borderRadius:'50%', background:'rgba(69,165,206,0.06)', pointerEvents:'none' }} />
        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <span style={{ display:'inline-block', background:'rgba(4,199,178,0.15)', color:'#04c7b2', fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 1rem', borderRadius:'99px', marginBottom:'1.25rem' }}>
            Conejo Motors · Escazú
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: '1rem' }}>
            El futuro de la movilidad<br />ya está en Costa Rica
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Compara modelos lado a lado o agenda una asesoría personalizada con nuestro equipo de expertos.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <a href="https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20una%20asesor%C3%ADa"
              target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:'0.6rem', background:'#25D366', color:'#fff', fontWeight:700, fontSize:'1rem', padding:'0.9rem 2rem', borderRadius:'12px', boxShadow:'0 4px 20px rgba(37,211,102,0.35)', transition:'transform 0.2s, box-shadow 0.2s', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(37,211,102,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(37,211,102,0.35)'; }}>
              <svg viewBox="0 0 24 24" fill="white" style={{ width:'22px', height:'22px' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Agendar Asesoría
            </a>
            <Link href="/compare"
              style={{ display:'inline-flex', alignItems:'center', gap:'0.6rem', background:'transparent', color:'#fff', fontWeight:700, fontSize:'1rem', padding:'0.9rem 2rem', borderRadius:'12px', border:'2px solid rgba(255,255,255,0.5)', transition:'all 0.2s', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.5)'; }}>
              ⚖️ Comparar vehículos
            </Link>
          </div>
        </div>
      </section>

      {/* ── ELECTROMOVILIDAD ── */}
      <ElectroSection />

      {/* ── CONTACTO ── */}
      <ContactSection />
    </>
  );
}
