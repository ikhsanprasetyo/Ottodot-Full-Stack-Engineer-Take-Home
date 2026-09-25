'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

interface AccessGuardProps {
  children: React.ReactNode;
}

/**
 * AccessGuard
 *
 * Melindungi komponen anak (children) berdasarkan izin user yang terdeteksi
 * secara otomatis dari URL saat ini via useGetPermission.
 */
export function AccessGuard({ children }: AccessGuardProps) {
  const router = useRouter();
  const { hasPermission, isLoading, pageName } = useGetPermission();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Hanya cek setelah mount dan data loading selesai
    if (mounted && !isLoading && !hasPermission) {
      toast.error(`Anda tidak memiliki akses ke halaman: ${pageName}`, {
        id: 'access-denied'
      });

      // Jeda sedikit agar user sempat melihat feedback (opsional) atau langsung redirect
      router.push('/dashboard');
    }
  }, [mounted, isLoading, hasPermission, pageName, router]);

  // Loading state (saat fetch data user profile)
  if (!mounted || isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Jika tidak punya izin, jangan render children untuk keamanan / mencegah flicker
  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
