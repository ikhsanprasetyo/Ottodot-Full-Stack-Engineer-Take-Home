'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    const measurementId =
      process.env.NEXT_PUBLIC_MEASUREMENT_ID || 'G-3M77TY962L';

    const interval = setInterval(() => {
      if (
        typeof window !== 'undefined' &&
        typeof (window as any).gtag === 'function'
      ) {
        (window as any).gtag?.('config', measurementId, { page_path: url });

        clearInterval(interval); // stop checking once it's available
      }
    }, 300); // cek setiap 300ms

    return () => clearInterval(interval); // bersihkan saat unmount
  }, [pathname, searchParams]);

  return null;
}
