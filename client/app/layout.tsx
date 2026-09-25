import './globals.css';
import ClientToaster from '@/components/ui/client-toaster';
import { ReactQueryProvider } from './ReactQueryProvider';
import Analytics from './analytics';
import { Suspense } from 'react';

export const metadata = {
  title: 'RTU Sinar Utama',
  description: 'Production & Distribution Management – Sinar Utama',
  keywords: 'RTU Sinar Utama, Produksi Sinar Utama, Mie Ayam',
  authors: [
    {
      name: 'Sinar Utama Mie Ayam',
      url: process.env.NEXT_PUBLIC_CLIENT_URL
    }
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo-full-color.png', type: 'image/png' }
    ]
  },
  openGraph: {
    title: 'RTU Sinar Utama',
    description: 'Production & Distribution Management – Sinar Utama',
    url: process.env.NEXT_PUBLIC_CLIENT_URL,
    siteName: 'RTU Sinar Utama',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/images/cover.jpg`,
        width: 1200,
        height: 630,
        alt: 'RTU Sinar Utama cover'
      }
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RTU Sinar Utama',
    description: 'Production & Distribution Management – Sinar Utama',
    images: [`${process.env.NEXT_PUBLIC_CLIENT_URL}/images/cover.jpg`]
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || '')
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5 // Allow zooming for accessibility, but set initial to 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const isProd = process.env.NODE_ENV === 'production';
  const measurementId =
    process.env.NEXT_PUBLIC_MEASUREMENT_ID || 'G-3M77TY962L';

  return (
    <html lang="en">
      <head>
        {isProd && (
          <>
            {/* Google Analytics (GA4) */}
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${measurementId}');
                `
              }}
            />
          </>
        )}
      </head>
      <body className="flex min-h-screen w-full flex-col">
        <ReactQueryProvider>
          <ClientToaster />
          {children}
          {isProd && (
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
          )}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
