import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import path from 'path';

// Memuat variabel .env dari folder client (Next.js project)
const envDir = __dirname;
loadEnvConfig(envDir);

// Konfigurasi Next.js
const nextConfig: NextConfig = {
  // 1. MENGHEMAT MEMORI & UKURAN BUILD (STANDALONE OUTPUT)
  output: 'export',
  trailingSlash: true, // Membuat struktur folder /dashboard/index.html agar tidak 404 saat F5 / Refresh di Web Server (Nginx)

  // INI KUNCI UNTUK MONOREPO
  outputFileTracingRoot: path.join(__dirname, '..'),

  eslint: {
    ignoreDuringBuilds: true
  },

  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [100],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5570',
        pathname: '/uploads/**'
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5570',
        pathname: '/uploads/**'
      },
      {
        protocol: 'https',
        hostname: '**'
      },
      {
        protocol: 'http',
        hostname: '**'
      }
    ],
    unoptimized: true // Matikan optimasi gambar di Node.js (Sangat menghemat RAM!)
  }
};

export default nextConfig;
