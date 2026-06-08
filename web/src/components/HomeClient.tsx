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
    <section style={{ background: 'linear-gradient(135deg, #071f37 0%, #082d4b 50%, #024f7d 100%)', padding: '5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Círculos decorativos */}
      <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(4,199,178,0.06)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(69,165,206,0.07)', pointerEvents:'none' }} />
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
              <div className="grid grid-cols-2 gap-4">
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

          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'2rem' }}>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'14px', padding:'1.25rem', textAlign:'center' }}>
                <div className="text-2xl mb-1">⛽</div>
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.55)', marginBottom:'0.25rem' }}>Con gasolina / mes</div>
                <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#fff' }}>{formatCRC(costoGas)}</div>
              </div>
              <div style={{ background:'rgba(4,199,178,0.12)', border:'1px solid rgba(4,199,178,0.3)', borderRadius:'14px', padding:'1.25rem', textAlign:'center' }}>
                <div className="text-2xl mb-1">⚡</div>
                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.55)', marginBottom:'0.25rem' }}>Con eléctrico / mes</div>
                <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#04c7b2' }}>{formatCRC(costoElec)}</div>
              </div>
            </div>
            <div style={{ background:'rgba(4,199,178,0.1)', border:'1px solid rgba(4,199,178,0.25)', borderRadius:'14px', padding:'1.5rem', textAlign:'center', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.1em', color:'#04c7b2', textTransform:'uppercase', marginBottom:'0.5rem' }}>Ahorro estimado</p>
              <p style={{ fontSize:'2.5rem', fontWeight:900, color:'#fff', lineHeight:1 }}>{formatCRC(ahorroMes)}<span style={{ fontSize:'1rem', fontWeight:400, color:'rgba(255,255,255,0.5)' }}> /mes</span></p>
              <p style={{ fontSize:'1rem', fontWeight:600, color:'rgba(255,255,255,0.7)', marginTop:'0.4rem' }}>{formatCRC(ahorroAno)} al año</p>
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
      <div className="container">
        <div className="section-header">
          <span className="section-tag">¿Por qué eléctrico?</span>
          <h2 className="section-title mt-2">Ventajas de la electromovilidad</h2>
          <p className="section-sub mt-2">Descubre por qué cada vez más costarricenses eligen vehículos eléctricos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
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
    { href: 'https://www.facebook.com/profile.php?id=61590859552347', label: 'Facebook', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { href: 'https://wa.me/50672071157', label: 'WhatsApp', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
  ];
  return (
    <section id="contacto" className="section bg-[#1a1a2e] text-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="section-tag">Estamos aquí para ayudarte</span>
            <h2 className="section-title text-white mt-2">Contáctanos</h2>
            <p className="text-white/70 mt-2 mb-8">Nuestro equipo de asesores te ayuda a encontrar el vehículo ideal para tu estilo de vida.</p>
            <ul className="space-y-4">
              {[
                { icon: '📧', label: 'ventas@conejomotors.com', href: 'mailto:ventas@conejomotors.com' },
                { icon: '📞', label: '7207-1157', href: 'tel:+50672071157' },
                { icon: '🕐', label: 'Lun–Vie 9am–6pm · Sáb 9am–1pm', href: null },
                { icon: '📍', label: 'Güachipelín de Escazú, San José, Costa Rica', href: null },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white/80">
                  <span className="text-xl">{item.icon}</span>
                  {item.href ? <a href={item.href} className="hover:text-[#4ade80] transition-colors">{item.label}</a> : <span>{item.label}</span>}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 mt-6">
              {socials.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00a651] transition-colors text-white">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden h-80 lg:h-full min-h-[300px]">
            <iframe
              title="Ubicación Conejo Motors — Güachipelín Escazú"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.76!2d-84.14305!3d9.93891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa0fef2b94bcfd3%3A0x6e42d5c5d3d2bdf5!2sG%C3%BCachipel%C3%ADn%2C+Escaz%C3%BA%2C+San+Jos%C3%A9%2C+Costa+Rica!5e0!3m2!1ses!2scr!4v1"
              width="100%" height="100%" style={{ border: 0, minHeight: '300px' }}
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
        <div className="relative overflow-hidden" style={{ height: '100vh', minHeight: '560px' }}>
          {slides.map((slide, i) => (
            <div key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {slide.imageUrl && slide.mediaType === 'video' ? (
                <video
                  src={getImageUrl(slide.imageUrl)}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay muted loop playsInline
                />
              ) : slide.imageUrl ? (
                <Image src={getImageUrl(slide.imageUrl)} alt={slide.title} fill
                  className="object-cover" priority={i === 0} sizes="100vw" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              <div className="relative z-10 h-full flex items-center">
                <div className="container mx-auto px-6" style={{ maxWidth: '1200px' }}>
                  <p className="text-[#04c7b2] text-sm font-semibold tracking-widest uppercase mb-3">
                    Movilidad Eléctrica · Costa Rica
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 max-w-xl">
                    {slide.title}
                  </h1>
                  <p className="text-white/80 text-lg mb-8 max-w-md">{slide.subtitle}</p>
                  <div className="flex flex-wrap gap-3">
                    <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
                      target="_blank" rel="noreferrer" className="btn-primary">
                      Solicitar Cotización
                    </a>
                    <Link href="/catalog" className="btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}>
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
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors text-xl"
                aria-label="Anterior">‹</button>
              <button onClick={() => { goTo(currentSlide + 1); resetTimer(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors text-xl"
                aria-label="Siguiente">›</button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => { goTo(i); resetTimer(); }}
                    className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
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
          <div className="container">
            <div className="section-header">
              <span className="section-tag">Selección del mes</span>
              <h2 className="section-title mt-2">Vehículos Destacados</h2>
              <p className="section-sub mt-2">Modelos disponibles ahora en nuestro concesionario en Escazú</p>
            </div>
            <div className="grid-vehicles">
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
                        <Link href={`/catalog/${vehicle.id}`} className="btn-primary text-sm py-2 flex-1 text-center">
                          Ver modelo
                        </Link>
                        <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20el%20${encodeURIComponent(`${vehicle.marca} ${vehicle.modelo} ${vehicle.año}`)}`}
                          target="_blank" rel="noreferrer" className="btn-outline text-sm py-2 flex-1 text-center">
                          Consultar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <Link href="/catalog" className="btn-outline" style={{ color: 'var(--brand-gray)', borderColor: 'var(--brand-gray)' }}>Ver catálogo completo →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CALCULADORA ── */}
      <SavingsCalculator />

      {/* ── CTA ── */}
      <section className="py-16 bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] text-white text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black mb-3">El futuro de la movilidad ya está en Costa Rica</h2>
          <p className="text-white/85 mb-8">Compara modelos lado a lado o agenda una asesoría personalizada con nuestro equipo.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20una%20asesor%C3%ADa"
              target="_blank" rel="noreferrer"
              className="bg-[#00a651] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#007a3d] transition-colors">
              📅 Agendar Asesoría
            </a>
            <Link href="/compare" className="border-2 border-white text-white font-bold px-6 py-3 rounded-xl hover:bg-white hover:text-[#1a1a2e] transition-colors">
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
