'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/api/isAuthenticated';
import { isAuthRefreshing } from '../api/handleTokenRefresh';

/**
 * Redirect user berdasarkan status autentikasi.
 *
 * @param shouldBeAuthenticated - true jika halaman hanya untuk user login, false jika untuk guest.
 * @param redirectTo - path tujuan redirect.
 */
export function useAuthRedirect(
  shouldBeAuthenticated: boolean,
  redirectTo: string
) {
  const router = useRouter();

  useEffect(() => {
    if (isAuthRefreshing()) return; // tunggu proses refresh selesai

    const auth = isAuthenticated();
    if (shouldBeAuthenticated && !auth) {
      router.push(redirectTo); // user belum login
    } else if (!shouldBeAuthenticated && auth) {
      router.push(redirectTo); // user sudah login
    }
  }, [shouldBeAuthenticated, redirectTo, router]);
}
