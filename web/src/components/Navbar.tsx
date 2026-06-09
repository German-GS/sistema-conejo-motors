'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/catalog', label: 'Modelos' },
  { href: '/compare', label: 'Comparador' },
  { href: '#contacto', label: 'Contacto' },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflowY = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById('contacto');
    if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
    else if (pathname !== '/') { window.location.href = '/#contacto'; }
  };

  const isActive = (href: string, exact?: boolean) => {
    if (href.startsWith('#')) return false;
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height: '68px', background: 'rgba(7,31,55,0.30)', backdropFilter: 'blur(6px)' }}
      >
        <div className="container mx-auto px-6 h-full flex items-center justify-between" style={{ maxWidth: '1200px' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo-blanco.png" alt="Conejo Motors" width={1237} height={693}
              className="object-contain"
              style={{ height: '36px', width: 'auto', maxWidth: '180px' }}
              priority />
          </Link>

          {/* Nav escritorio */}
          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map(({ href, label, exact }) =>
              href.startsWith('#') ? (
                <a key={href} href={href} onClick={handleContact}
                  style={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.03em', paddingBottom: '2px', borderBottom: '2px solid transparent', transition: 'color 0.2s' }}>
                  {label}
                </a>
              ) : (
                <Link key={href} href={href}
                  style={{
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    paddingBottom: '2px',
                    borderBottom: isActive(href, exact) ? '2px solid #04c7b2' : '2px solid transparent',
                    transition: 'color 0.2s, border-color 0.2s',
                    opacity: isActive(href, exact) ? 1 : 0.92,
                  }}>
                  {label}
                </Link>
              )
            )}
          </nav>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <Link href="https://sistema.conejomotors.com/login" target="_blank"
              style={{ color: '#fff', opacity: 0.85, fontSize: '0.88rem', fontWeight: 500, padding: '0.45rem 1rem', borderRadius: '8px', transition: 'opacity 0.2s, background 0.2s' }}
              className="hidden md:inline-flex hover:opacity-100 hover:bg-white/10">
              Ingresar
            </Link>
            <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20un%20veh%C3%ADculo%20el%C3%A9ctrico"
              target="_blank" rel="noreferrer"
              className="btn-primary text-sm py-2 px-5"
              style={{ display: 'none' }}
              id="cta-cotizar">
              💬 Cotizar
            </a>
            <style>{`@media (min-width: 768px) { #cta-cotizar { display: inline-flex !important; } }`}</style>

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden flex flex-col gap-[5px] w-8 h-8 justify-center items-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Menú móvil */}
      <div className={`fixed inset-0 z-40 md:hidden flex flex-col transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'linear-gradient(160deg, #071f37 0%, #082d4b 60%, #024f7d 100%)' }}>
        {/* Header del menú */}
        <div style={{ height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/" onClick={() => setOpen(false)}>
            <Image src="/logo-blanco.png" alt="Conejo Motors" width={1237} height={693} className="object-contain" style={{ height: '32px', width: 'auto', maxWidth: '160px' }} />
          </Link>
          <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.4rem' }}>
            ×
          </button>
        </div>

        {/* Links de navegación */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 2rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {LINKS.map(({ href, label, exact }) =>
              href.startsWith('#') ? (
                <a key={href} href={href} onClick={handleContact}
                  style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1.35rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', letterSpacing: '-0.01em', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}>
                  {label}
                </a>
              ) : (
                <Link key={href} href={href}
                  style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '14px', fontSize: '1.35rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em', color: isActive(href, exact) ? '#04c7b2' : 'rgba(255,255,255,0.85)', background: isActive(href, exact) ? 'rgba(4,199,178,0.1)' : 'transparent', borderLeft: isActive(href, exact) ? '3px solid #04c7b2' : '3px solid transparent', transition: 'background 0.15s, color 0.15s' }}>
                  {label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* CTAs */}
        <div style={{ padding: '1.5rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20un%20veh%C3%ADculo%20el%C3%A9ctrico"
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '1rem', borderRadius: '14px', background: '#04c7b2', color: '#071f37', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', letterSpacing: '0.01em' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.987-1.417A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.074-1.12l-.29-.173-3.003.853.854-2.935-.19-.301A7.944 7.944 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/></svg>
            Solicitar Cotización
          </a>
          <Link href="https://sistema.conejomotors.com/login" target="_blank"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
            Ingresar al Sistema
          </Link>
        </div>
      </div>
    </>
  );
}
