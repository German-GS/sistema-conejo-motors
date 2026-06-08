'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, formatCRC, API } from '@/lib/api';
import type { Vehicle } from '@/types';

function SpecItem({ label, value, unit = '' }: { label: string; value?: string | number | null; unit?: string }) {
  if (!value) return null;
  return (
    <li className="spec-item">
      <strong>{label}</strong>
      <span>{value} {unit}</span>
    </li>
  );
}

function FeatureList({ title, features }: { title: string; features?: string[] }) {
  if (!features?.length) return null;
  return (
    <div className="mb-6">
      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-[#00a651] rounded-full inline-block" />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-[#00a651] mt-0.5 shrink-0">✓</span> {f}
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
    <div className="bg-[#f0faf5] border border-[#00a651]/20 rounded-2xl p-6">
      <h3 className="font-bold text-gray-900 mb-5 text-lg">💳 Calculadora de Financiamiento</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Prima inicial</label>
          <input type="number" value={inicial} step={500000}
            onChange={e => setInicial(Number(e.target.value))} className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Plazo (meses)</label>
          <select value={plazo} onChange={e => setPlazo(Number(e.target.value))} className="form-input">
            {[12,24,36,48,60,72,84].map(p => <option key={p} value={p}>{p} meses</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tasa anual (%)</label>
          <input type="number" value={tasa} min={1} max={30} step={0.5}
            onChange={e => setTasa(Number(e.target.value))} className="form-input" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Monto a financiar</p>
          <p className="font-bold text-gray-900 text-sm">{formatCRC(monto)}</p>
        </div>
        <div className="bg-[#00a651] rounded-xl p-3 text-white">
          <p className="text-xs text-white/80 mb-1">Cuota mensual</p>
          <p className="font-black text-lg">{formatCRC(cuota)}</p>
        </div>
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
          <p className="font-bold text-gray-900 text-sm">{formatCRC(totalPagar)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">* Cálculo estimado. Las condiciones reales pueden variar según la entidad financiera.</p>
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
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: '1200px' }}>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-[#00a651] transition-colors">Inicio</Link>
        <span>›</span>
        <Link href="/catalog" className="hover:text-[#00a651] transition-colors">Catálogo</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{vehicleName}</span>
      </nav>

      {/* HERO — galería + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Galería */}
        <div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 mb-3">
            {images.length > 0 ? (
              <Image src={imgSrc(activeImg)} alt={`${vehicleName} — vista ${activeImg + 1}`}
                fill className="object-cover" priority sizes="(max-width:1024px) 100vw, 50vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">🚗</div>
            )}
            {vehicle.visibilidad === 'Agotado' && (
              <div className="badge-agotado">📦 Agotado</div>
            )}
            {vehicle.visibilidad === 'Contrapedido' && (
              <div className="badge-pedido">🔄 Disponible Bajo Pedido</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${i === activeImg ? 'border-[#00a651]' : 'border-transparent'}`}>
                  <Image src={getImageUrl(img.url)} alt={`Vista ${i + 1}`} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info + formulario */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{vehicleName}</h1>
            {vehicle.color && (
              <span className="shrink-0 text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">🎨 {vehicle.color}</span>
            )}
          </div>

          {/* Key specs */}
          {(vehicle.autonomia_km || vehicle.aceleracion_0_100 || vehicle.potencia_hp || vehicle.capacidad_bateria_kwh) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {vehicle.autonomia_km && (
                <div className="text-center bg-gray-50 rounded-xl p-3">
                  <div className="text-xl mb-0.5">🛣️</div>
                  <div className="font-black text-gray-900">{vehicle.autonomia_km} km</div>
                  <div className="text-xs text-gray-500">Autonomía</div>
                </div>
              )}
              {vehicle.aceleracion_0_100 && (
                <div className="text-center bg-gray-50 rounded-xl p-3">
                  <div className="text-xl mb-0.5">⚡</div>
                  <div className="font-black text-gray-900">{vehicle.aceleracion_0_100} s</div>
                  <div className="text-xs text-gray-500">0-100 km/h</div>
                </div>
              )}
              {vehicle.potencia_hp && (
                <div className="text-center bg-gray-50 rounded-xl p-3">
                  <div className="text-xl mb-0.5">🏎️</div>
                  <div className="font-black text-gray-900">{vehicle.potencia_hp} HP</div>
                  <div className="text-xs text-gray-500">Potencia</div>
                </div>
              )}
              {vehicle.capacidad_bateria_kwh && (
                <div className="text-center bg-gray-50 rounded-xl p-3">
                  <div className="text-xl mb-0.5">🔋</div>
                  <div className="font-black text-gray-900">{vehicle.capacidad_bateria_kwh} kWh</div>
                  <div className="text-xs text-gray-500">Batería</div>
                </div>
              )}
            </div>
          )}

          {/* Precio */}
          <div className="mb-5">
            <p className="text-3xl font-black text-[#00a651]">
              {formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
            </p>
            {vehicle.precio_venta_final && vehicle.precio_venta_final < vehicle.precio_venta && (
              <p className="text-sm text-gray-400 line-through">{formatCRC(Number(vehicle.precio_venta))}</p>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20el%20${encodeURIComponent(vehicleName)}`}
              target="_blank" rel="noreferrer" className="btn-primary flex-1 min-w-[140px] text-center">
              💬 Cotizar por WhatsApp
            </a>
            <Link href="/compare" className="btn-outline flex-1 min-w-[140px] text-center">
              ⚖️ Comparar
            </Link>
          </div>

          {/* Formulario de contacto */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4">📋 Solicitar información</h3>
            {sent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-semibold text-gray-900">¡Gracias! Un asesor te contactará pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input name="nombre" value={lead.nombre} onChange={e => setLead({ ...lead, nombre: e.target.value })}
                  placeholder="Nombre completo" required className="form-input" />
                <input name="email" type="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })}
                  placeholder="Correo electrónico" required className="form-input" />
                <input name="telefono" value={lead.telefono} onChange={e => setLead({ ...lead, telefono: e.target.value })}
                  placeholder="Teléfono (opcional)" className="form-input" />
                <button type="submit" disabled={sending} className="btn-primary w-full">
                  {sending ? 'Enviando...' : 'Solicitar Información'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Calculadora financiamiento */}
      <div className="mb-12">
        <LoanCalc precioBase={Number(vehicle.precio_venta)} />
      </div>

      {/* Tabs de especificaciones */}
      <div className="mb-4">
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-4">
          {activeTab === 'rendimiento' && (
            <ul className="spec-list">
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
            <ul className="spec-list">
              <SpecItem label="Largo" value={vehicle.largo_mm} unit="mm" />
              <SpecItem label="Ancho" value={vehicle.ancho_mm} unit="mm" />
              <SpecItem label="Alto" value={vehicle.alto_mm} unit="mm" />
              <SpecItem label="Distancia entre Ejes" value={vehicle.distancia_ejes_mm} unit="mm" />
              <SpecItem label="Peso" value={vehicle.peso_kg} unit="kg" />
              <SpecItem label="Maletero" value={vehicle.capacidad_maletero_l} unit="L" />
            </ul>
          )}
          {activeTab === 'equipamiento' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureList title="Seguridad" features={vehicle.seguridad} />
              <FeatureList title="Interior" features={vehicle.interior} />
              <FeatureList title="Exterior" features={vehicle.exterior} />
              <FeatureList title="Tecnología" features={vehicle.tecnologia} />
            </div>
          )}
        </div>
      </div>

      {/* CTA final */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#0f3460] rounded-2xl p-8 text-white text-center">
        <h2 className="text-xl md:text-2xl font-black mb-2">¿Listo para dar el salto a eléctrico?</h2>
        <p className="text-white/70 mb-6">Agenda una prueba de manejo sin compromiso.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href={`https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20una%20prueba%20del%20${encodeURIComponent(vehicleName)}`}
            target="_blank" rel="noreferrer" className="btn-primary">
            📅 Agendar Test Drive
          </a>
          <Link href="/catalog" className="btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>
            Ver más modelos
          </Link>
        </div>
      </div>
    </div>
  );
}
