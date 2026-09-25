'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: '1' }, { id: 'refresh-token' }];
}

export default function UserRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
