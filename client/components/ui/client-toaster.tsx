'use client';

import { Toaster } from 'sonner';

export default function ClientToaster() {
  return (
    <Toaster position="top-right" richColors closeButton duration={4000} />
  );
}
