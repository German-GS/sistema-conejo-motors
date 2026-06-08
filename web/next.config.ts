import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google Cloud Storage (imágenes subidas al backend)
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      // Backend Cloud Run (imágenes legadas)
      { protocol: 'https', hostname: 'conejo-motors-backend-18412185769.us-central1.run.app' },
      // Cualquier subdominio de googleapis
      { protocol: 'https', hostname: '**.googleapis.com' },
    ],
  },
  // Cabeceras de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
