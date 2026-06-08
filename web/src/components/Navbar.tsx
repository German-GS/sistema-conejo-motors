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
    document.body.style.overflow = open ? 'hidden' : '';
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
            <Image src="/logo.png" alt="Conejo Motors" width={180} height={40}
              className="h-9 w-auto object-contain brightness-0 invert"
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
              className="hidden md:inline-flex btn-primary text-sm py-2 px-5">
              💬 Cotizar
            </a>

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

      {/* Overlay móvil */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Menú móvil */}
      <nav className={`fixed top-16 left-0 right-0 z-40 bg-white shadow-xl md:hidden transition-all duration-300 overflow-hidden ${
        open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 py-4 flex flex-col gap-1">
          {LINKS.map(({ href, label, exact }) =>
            href.startsWith('#') ? (
              <a key={href} href={href} onClick={handleContact}
                className="px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {label}
              </a>
            ) : (
              <Link key={href} href={href}
                className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                  isActive(href, exact)
                    ? 'text-[#1a1a2e] bg-gray-100 font-bold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {label}
              </Link>
            )
          )}
          <hr className="my-2 border-gray-100" />
          <a href="https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20un%20veh%C3%ADculo%20el%C3%A9ctrico"
            target="_blank" rel="noreferrer"
            className="btn-primary text-center mt-1">
            💬 Solicitar Cotización
          </a>
          <Link href="https://sistema.conejomotors.com/login" target="_blank"
            className="btn-ghost text-center mt-1">
            Ingresar al Sistema
          </Link>
        </div>
      </nav>
    </>
  );
}
