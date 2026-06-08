import { getImageUrl } from "@/utils/imageUrl";
// src/pages/public/HomePage.tsx

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./HomePage.module.css";
import catalogStyles from "@/pages/admin/sales/CatalogPage/CatalogPage.module.css";
import { ElectromovilidadSection } from "@/components/ElectromovilidadSection";

// --- INTERFACES ---
interface CarouselSlide {
  title: string;
  subtitle: string;
  imageUrl: string;
}
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  precio_venta_final: number | null;
  imagenes?: { url: string }[];
  profile?: { imagenes?: { url: string }[] };
}

const formatCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

// ── Calculadora de ahorro ──────────────────────────────────────────────────
const SavingsCalculator = () => {
  const [km, setKm] = useState(1200);
  const [precioGas, setPrecioGas] = useState(850);       // ₡/litro
  const [rendimiento, setRendimiento] = useState(12);    // km/litro gasolina
  const [precioKwh, setPrecioKwh] = useState(210);       // ₡/kWh
  const [consumoElec, setConsumoElec] = useState(15);    // kWh/100km

  const costoGas  = Math.round((km / rendimiento) * precioGas);
  const costoElec = Math.round((km / 100) * consumoElec * precioKwh);
  const ahorroMes = Math.max(0, costoGas - costoElec);
  const ahorroAno = ahorroMes * 12;

  return (
    <div className={styles.calcSection}>
      <div className={styles.calcInner}>
        <div className={styles.calcLeft}>
          <span className={styles.calcTag}>Herramienta interactiva</span>
          <h2 className={styles.calcTitle}>¿Cuánto ahorrarías al pasarte a eléctrico?</h2>
          <p className={styles.calcSub}>
            Ajusta los valores según tu consumo real y ve el ahorro estimado en colones.
          </p>

          <div className={styles.calcFields}>
            <div className={styles.calcField}>
              <label>Km por mes: <strong>{km.toLocaleString("es-CR")} km</strong></label>
              <input type="range" min={300} max={5000} step={100}
                value={km} onChange={e => setKm(Number(e.target.value))} className={styles.slider} />
            </div>
            <div className={styles.calcRow}>
              <div className={styles.calcField}>
                <label>Precio gasolina (₡/litro)</label>
                <input type="number" value={precioGas} min={400} max={2000}
                  onChange={e => setPrecioGas(Number(e.target.value))} className={styles.calcInput} />
              </div>
              <div className={styles.calcField}>
                <label>Rendimiento (km/litro)</label>
                <input type="number" value={rendimiento} min={5} max={30}
                  onChange={e => setRendimiento(Number(e.target.value))} className={styles.calcInput} />
              </div>
            </div>
            <div className={styles.calcRow}>
              <div className={styles.calcField}>
                <label>Precio electricidad (₡/kWh)</label>
                <input type="number" value={precioKwh} min={50} max={500}
                  onChange={e => setPrecioKwh(Number(e.target.value))} className={styles.calcInput} />
              </div>
              <div className={styles.calcField}>
                <label>Consumo eléctrico (kWh/100km)</label>
                <input type="number" value={consumoElec} min={5} max={40}
                  onChange={e => setConsumoElec(Number(e.target.value))} className={styles.calcInput} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.calcRight}>
          <div className={styles.calcResult}>
            <div className={styles.calcResultRow}>
              <div className={styles.calcResultCard + " " + styles.gas}>
                <span className={styles.calcResultIcon}>⛽</span>
                <span className={styles.calcResultLabel}>Con gasolina / mes</span>
                <span className={styles.calcResultValue}>{formatCRC(costoGas)}</span>
              </div>
              <div className={styles.calcResultCard + " " + styles.elec}>
                <span className={styles.calcResultIcon}>⚡</span>
                <span className={styles.calcResultLabel}>Con eléctrico / mes</span>
                <span className={styles.calcResultValue}>{formatCRC(costoElec)}</span>
              </div>
            </div>
            <div className={styles.calcSavings}>
              <p className={styles.calcSavingsLabel}>Ahorro estimado</p>
              <p className={styles.calcSavingsMes}>{formatCRC(ahorroMes)} <span>/mes</span></p>
              <p className={styles.calcSavingsAno}>{formatCRC(ahorroAno)} al año</p>
            </div>
            <Link to="/catalog" className={styles.calcCta}>
              Ver vehículos eléctricos →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Franja de stats ────────────────────────────────────────────────────────
const StatsBar = () => (
  <div className={styles.statsBar}>
    {[
      { icon: "⚡", value: "100%", label: "Modelos eléctricos" },
      { icon: "🔋", value: "3,000 ciclos", label: "Garantía Batería Blade BYD" },
      { icon: "🚗", value: "Entrega", label: "En todo Costa Rica" },
      { icon: "💬", value: "Asesoría", label: "Personalizada sin costo" },
    ].map((s, i) => (
      <div key={i} className={styles.statItem}>
        <span className={styles.statIcon}>{s.icon}</span>
        <span className={styles.statValue}>{s.value}</span>
        <span className={styles.statLabel}>{s.label}</span>
      </div>
    ))}
  </div>
);

export const HomePage = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (idx: number) => {
    setCurrentSlide((idx + slides.length) % slides.length);
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCurrentSlide(prev => (prev + 1) % slides.length), 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await apiClient.get("/site-settings/public");
        const slidesData = JSON.parse(
          settingsRes.data.find((s: any) => s.key === "carousel_slides")?.value || "[]"
        );
        const featuredIds = JSON.parse(
          settingsRes.data.find((s: any) => s.key === "featured_vehicles")?.value || "[]"
        );
        setSlides(slidesData);
        if (featuredIds.length > 0) {
          const vehiclesRes = await Promise.all(featuredIds.map((id: number) => apiClient.get(`/vehicles/${id}`)));
          setFeaturedVehicles(vehiclesRes.map(res => res.data));
        }
      } catch (error) {
        console.error("Error al cargar datos de la página principal", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      resetTimer();
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [currentSlide, slides.length]);

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p>Cargando...</p>
    </div>
  );

  return (
    <div className={styles.homeContainer}>

      {/* ── CARRUSEL ── */}
      {slides.length > 0 && (
        <div className={styles.carousel}>
          {slides.map((slide, index) => (
            <div key={index} className={`${styles.slide} ${index === currentSlide ? styles.active : ""}`}>
              {slide.imageUrl && (
                <img src={getImageUrl(slide.imageUrl)} alt={slide.title}
                  className={styles.slideImg} loading={index === 0 ? "eager" : "lazy"} />
              )}
              <div className={styles.slideContent}>
                <p className={styles.slideEyebrow}>Movilidad Eléctrica · Costa Rica</p>
                <h1>{slide.title}</h1>
                <p className={styles.slideSub}>{slide.subtitle}</p>
                <div className={styles.slideButtons}>
                  <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
                    target="_blank" rel="noreferrer" className={styles.slideBtnPrimary}>
                    Solicitar Cotización
                  </a>
                  <Link to="/catalog" className={styles.slideBtnSecondary}>
                    Ver Catálogo
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Controles de navegación */}
          {slides.length > 1 && (
            <>
              <button className={`${styles.navBtn} ${styles.navPrev}`}
                onClick={() => { goTo(currentSlide - 1); resetTimer(); }} aria-label="Anterior">
                ‹
              </button>
              <button className={`${styles.navBtn} ${styles.navNext}`}
                onClick={() => { goTo(currentSlide + 1); resetTimer(); }} aria-label="Siguiente">
                ›
              </button>
              <div className={styles.dots}>
                {slides.map((_, i) => (
                  <button key={i} className={`${styles.dot} ${i === currentSlide ? styles.dotActive : ""}`}
                    onClick={() => { goTo(i); resetTimer(); }} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </>
          )}

          {/* Scroll indicator */}
          <div className={styles.scrollIndicator}>
            <span />
          </div>
        </div>
      )}

      {/* ── FRANJA DE STATS ── */}
      <StatsBar />

      {/* ── VEHÍCULOS DESTACADOS ── */}
      {featuredVehicles.length > 0 && (
        <div className={styles.featuredSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Selección del mes</span>
            <h2>Vehículos Destacados</h2>
            <p className={styles.sectionSub}>Modelos disponibles ahora en nuestro concesionario en Escazú</p>
          </div>
          <div className={styles.featuredGrid}>
            {featuredVehicles.map((vehicle) => (
              <div key={vehicle.id} className={catalogStyles.vehicleCard}>
                <img
                  src={
                    vehicle.imagenes?.[0] ? getImageUrl(vehicle.imagenes[0].url)
                    : vehicle.profile?.imagenes?.[0] ? getImageUrl(vehicle.profile.imagenes[0].url)
                    : "/placeholder.png"
                  }
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className={catalogStyles.vehicleImage}
                  loading="lazy"
                />
                <div className={catalogStyles.vehicleInfo}>
                  <h3>{vehicle.marca} {vehicle.modelo} ({vehicle.año})</h3>
                  <p className={catalogStyles.price}>
                    {formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", flexWrap: "wrap" }}>
                    <Link to={`/catalog/${vehicle.id}`} className="btn btn-principal" style={{ flex: 1 }}>
                      Ver este modelo
                    </Link>
                    <a
                      href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20el%20${encodeURIComponent(vehicle.marca + " " + vehicle.modelo + " " + vehicle.año)}`}
                      target="_blank" rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, textAlign: "center" }}
                    >
                      Consultar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/catalog" className={styles.verTodosBtn}>
              Ver catálogo completo →
            </Link>
          </div>
        </div>
      )}

      {/* ── CALCULADORA DE AHORRO ── */}
      <SavingsCalculator />

      {/* ── BANNER CTA ── */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>El futuro de la movilidad ya está en Costa Rica</h2>
          <p>Compara modelos lado a lado o agenda una asesoría personalizada con nuestro equipo.</p>
          <div className={styles.ctaButtons}>
            <a href="https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20una%20asesor%C3%ADa"
              target="_blank" rel="noreferrer" className={styles.ctaBtnPrimary}>
              📅 Agendar Asesoría
            </a>
            <Link to="/compare" className={styles.ctaBtnSecondary}>
              ⚖️ Comparar vehículos
            </Link>
          </div>
        </div>
      </div>

      {/* ── ELECTROMOVILIDAD ── */}
      <ElectromovilidadSection />

      {/* ── SECCIÓN DE CONTACTO ── */}
      <div id="contacto" className={styles.contactSection}>
        <div className={styles.contactInner}>
          <div className={styles.contactInfo}>
            <h2>Contáctanos</h2>
            <p className={styles.contactSubtitle}>Estamos aquí para ayudarte a encontrar tu vehículo ideal.</p>
            <ul className={styles.contactList}>
              <li>
                <span className={styles.contactIcon}>📧</span>
                <a href="mailto:ventas@conejomotors.com">ventas@conejomotors.com</a>
              </li>
              <li>
                <span className={styles.contactIcon}>📞</span>
                <a href="tel:+50672071157">7207-1157</a>
              </li>
              <li>
                <span className={styles.contactIcon}>🕐</span>
                <span>Lunes a Viernes · 9:00 am – 6:00 pm</span>
              </li>
              <li>
                <span className={styles.contactIcon}>📍</span>
                <span>Güachipelín de Escazú, San José, Costa Rica</span>
              </li>
            </ul>
            <p className={styles.socialTitle}>Síguenos</p>
            <div className={styles.socialLinks}>
              <a href="#" title="Instagram" className={`${styles.socialBtn} ${styles.instagram}`} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61590859552347" title="Facebook" className={`${styles.socialBtn} ${styles.facebook}`} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://wa.me/50672071157" title="WhatsApp" className={`${styles.socialBtn} ${styles.whatsapp}`} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="#" title="TikTok" className={`${styles.socialBtn} ${styles.tiktok}`} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>
          </div>
          <div className={styles.mapWrapper}>
            <iframe
              title="Ubicación Conejo Motors"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.76!2d-84.14305!3d9.93891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa0fef2b94bcfd3%3A0x6e42d5c5d3d2bdf5!2sG%C3%BCachipel%C3%ADn%2C+Escaz%C3%BA%2C+San+Jos%C3%A9%2C+Costa+Rica!5e0!3m2!1ses!2scr!4v1"
              width="100%" height="100%"
              style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      {/* ── BOTÓN FLOTANTE WHATSAPP ── */}
      <a
        href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20un%20veh%C3%ADculo%20el%C3%A9ctrico"
        target="_blank" rel="noreferrer"
        className={styles.whatsappFloat}
        title="Chatea con nosotros"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className={styles.whatsappFloatLabel}>¿Hablamos?</span>
      </a>

    </div>
  );
};
