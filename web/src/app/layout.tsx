import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://conejomotors.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Conejo Motors — Vehículos Eléctricos en Costa Rica',
    template: '%s | Conejo Motors',
  },
  description:
    'Conejo Motors: concesionario de vehículos eléctricos en Costa Rica. BYD, MG, GWM y más marcas. Catálogo, precios y test drive disponibles.',
  openGraph: {
    type: 'website',
    locale: 'es_CR',
    url: BASE_URL,
    siteName: 'Conejo Motors',
    images: [{ url: '/og-default.png', width: 1237, height: 693, alt: 'Conejo Motors' }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  verification: { google: 'aOI8X4LF3BB-i3c1v9AnAwSk-Oc1S3K-r1OTiJySBIA' },
  other: { 'geo.region': 'CR', 'geo.placename': 'Costa Rica' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: 'Conejo Motors',
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.png`,
    description: 'Concesionario especializado en vehículos eléctricos en Costa Rica.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CR',
      addressRegion: 'San José',
      addressLocality: 'Escazú',
      streetAddress: 'Güachipelín de Escazú',
    },
    telephone: '+50672071157',
    email: 'ventas@conejomotors.com',
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '09:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '13:00' },
    ],
    sameAs: ['https://www.facebook.com/profile.php?id=61590859552347'],
    priceRange: '₡₡₡',
    currenciesAccepted: 'CRC',
    paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  };

  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1" style={{ paddingTop: '68px' }}>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
