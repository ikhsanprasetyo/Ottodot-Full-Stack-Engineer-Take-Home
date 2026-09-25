'use client';
import { usePathname } from 'next/navigation';

export function useGetPageName() {
  const pathname = usePathname(); // contoh: "/dtfc" atau "/employee/list"
  if (!pathname) return '';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '';

  // default: ambil segmen terakhir dari path
  return parts[parts.length - 1];
}
