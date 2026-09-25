import { getUserFromStorage } from '../hooks/getUserFromStorage';
import { isExpired } from '../date';
import { isAuthRefreshing } from './handleTokenRefresh';

export function isAuthenticated(): boolean {
  if (isAuthRefreshing()) return true;

  const user = getUserFromStorage();
  const expiresAt = user?.accessTokenExpiresAt;
  //console.log({
  //  expiresAt: expiresAt ? getDateStr(expiresAt, 'YYYY-MM-DD HH:mm:ss') : 'null'
  //});

  // Jika token atau expiry tidak ada → dianggap tidak login
  if (!expiresAt) return false;
  return !isExpired(expiresAt); // true kalau token masih valid
}
