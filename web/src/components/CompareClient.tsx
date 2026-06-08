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

  const toggle = (v: Vehicle) => {
    const idx = selected.findIndex(s => s?.id === v.id);
    if (idx !== -1) {
      setSelected(prev => prev.map((s, i) => i === idx ? null : s));
    } else {
      const emptyIdx = selected.findIndex(s => s === null);
      if (emptyIdx !== -1) setSelected(prev => prev.map((s, i) => i === emptyIdx ? v : s));
    }
  };

  const isSelected = (v: Vehicle) => selected.some(s => s?.id === v.id);
  const count = selected.filter(Boolean).length;

  const getVal = (v: Vehicle, key: keyof Vehicle) => {
    const val = v[key];
    return val != null ? val : null;
  };

  // Highlight best value for numeric specs
  const getBest = (key: keyof Vehicle): number | null => {
    const vals = selected.filter(Boolean).map(v => Number(getVal(v!, key))).filter(x => !isNaN(x) && x > 0);
    if (!vals.length) return null;
    const highBetter: (keyof Vehicle)[] = ['autonomia_km', 'capacidad_bateria_kwh', 'potencia_hp', 'torque_nm', 'velocidad_maxima', 'numero_pasajeros', 'capacidad_maletero_l'];
    return highBetter.includes(key) ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: '1200px' }}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">Comparador de Vehículos Eléctricos</h1>
        <p className="text-gray-500">Selecciona hasta {MAX} vehículos para comparar sus especificaciones</p>
      </div>

      {/* Selector */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-600 mb-3">{count}/{MAX} vehículos seleccionados</p>
        <div className="grid-vehicles">
          {vehicles.map(v => {
            const sel = isSelected(v);
            const imgSrc = v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url)
              : v.profile?.imagenes?.[0]?.url ? getImageUrl(v.profile.imagenes[0].url)
              : '/placeholder.png';
            return (
              <button key={v.id} onClick={() => toggle(v)}
                className={`vehicle-card text-left transition-all ${sel ? 'ring-2 ring-[#00a651] ring-offset-2' : count >= MAX && !sel ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={count >= MAX && !sel}>
                <div className="vehicle-card__img">
                  <Image src={imgSrc} alt={`${v.marca} ${v.modelo}`} fill className="object-cover" sizes="(max-width:640px) 100vw, 33vw" />
                  {sel && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-[#00a651] rounded-full flex items-center justify-center text-white font-bold text-sm z-10">
                      {selected.findIndex(s => s?.id === v.id) + 1}
                    </div>
                  )}
                </div>
                <div className="vehicle-card__body">
                  <p className="vehicle-card__name">{v.marca} {v.modelo} ({v.año})</p>
                  <p className="vehicle-card__price">{formatCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                  {v.autonomia_km && <p className="text-xs text-gray-500">🛣️ {v.autonomia_km} km</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla comparativa */}
      {count >= 2 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-600 w-36">Especificación</th>
                {selected.map((v, i) => v ? (
                  <th key={i} className="p-4 text-center min-w-[180px]">
                    <div className="font-bold text-gray-900">{v.marca} {v.modelo}</div>
                    <div className="text-xs text-gray-500 font-normal">{v.año}</div>
                  </th>
                ) : null)}
              </tr>
            </thead>
            <tbody>
              {/* Imagen */}
              <tr className="border-b border-gray-100">
                <td className="p-4 text-gray-500 font-medium">Imagen</td>
                {selected.map((v, i) => v ? (
                  <td key={i} className="p-4 text-center">
                    <div className="relative w-24 h-16 mx-auto rounded-lg overflow-hidden">
                      <Image
                        src={v.imagenes?.[0]?.url ? getImageUrl(v.imagenes[0].url) : '/placeholder.png'}
                        alt={v.modelo} fill className="object-cover" sizes="96px" />
                    </div>
                  </td>
                ) : null)}
              </tr>

              {SPECS.map(({ label, key, unit }) => {
                const best = getBest(key);
                return (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-gray-600 font-medium">{label}</td>
                    {selected.map((v, i) => {
                      if (!v) return null;
                      const val = getVal(v, key);
                      const isBest = best !== null && Number(val) === best;
                      const display = key === 'precio_venta_final'
                        ? formatCRC(Number(v.precio_venta_final ?? v.precio_venta))
                        : val != null ? `${val}${unit ? ' ' + unit : ''}` : '—';
                      return (
                        <td key={i} className={`p-4 text-center font-semibold ${isBest && val ? 'text-[#00a651]' : val ? 'text-gray-900' : 'text-gray-300'}`}>
                          {display}
                          {isBest && val ? ' ⭐' : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Ver ficha */}
              <tr>
                <td className="p-4 text-gray-500 font-medium">Ficha técnica</td>
                {selected.map((v, i) => v ? (
                  <td key={i} className="p-4 text-center">
                    <Link href={`/catalog/${v.id}`} className="btn-primary text-sm py-2 px-4 inline-flex">
                      Ver ficha →
                    </Link>
                  </td>
                ) : null)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {count < 2 && count > 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">⚖️</div>
          <p>Selecciona al menos 2 vehículos para ver la comparación</p>
        </div>
      )}
    </div>
  );
}
