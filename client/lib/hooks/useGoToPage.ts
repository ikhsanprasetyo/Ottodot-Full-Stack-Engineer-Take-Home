'use client';

import { useRouter } from 'next/navigation';

export const useGoToPage = () => {
  const router = useRouter();

  const goToPage = (path: string) => {
    if (!path.startsWith('/')) path = '/' + path;
    router.push(path);
  };

  return goToPage;
};
