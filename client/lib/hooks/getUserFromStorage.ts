'use client';

// hooks/useSessionUser.ts
import { getSessionStorage } from '@/lib/sessionStorage';
import { UserSessionData } from '@/lib/type/user-session';

export function getUserFromStorage(): UserSessionData | null {
  return getSessionStorage<UserSessionData>('user');
}
