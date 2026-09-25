import './globals.css';
import ClientToaster from '@/components/ui/client-toaster';
import { ReactQueryProvider } from './ReactQueryProvider';
import Analytics from './analytics';
import { Suspense } from 'react';

export const metadata = {
  title: 'Primary Math & Science Tuition Singapore | Ottodot',
  description:
    'Primary Math and Science tuition blended with interactive Roblox gameplay — for deeper, more memorable learning that sticks.',
  keywords:
    'Ottodot, Math Tuition Singapore, Science Tuition Singapore, Roblox Learning, Primary School Tuition',
  authors: [
    {
      name: 'Ottodot Education',
      url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://www.ottodot.com'
    }
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false
  },
  icons: {
    icon: [
      { url: '/logo.ico', type: 'image/x-icon' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    shortcut: '/logo.ico',
    apple: '/logo.ico'
  },
  openGraph: {
    title: 'Primary Math & Science Tuition Singapore | Ottodot',
    description:
      'Primary Math and Science tuition blended with interactive Roblox gameplay — for deeper, more memorable learning that sticks.',
    url: process.env.NEXT_PUBLIC_CLIENT_URL || 'https://www.ottodot.com',
    siteName: 'Ottodot',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primary Math & Science Tuition Singapore | Ottodot',
    description:
      'Primary Math and Science tuition blended with interactive Roblox gameplay — for deeper, more memorable learning that sticks.'
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_CLIENT_URL || 'https://www.ottodot.com'
  )
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
        <link rel="icon" href="/logo.ico" sizes="any" />
        <link rel="shortcut icon" href="/logo.ico" />
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
