import { setSessionStorage } from '@/lib/sessionStorage';

export function saveUserSession(data: any) {
  if (!data) {
    console.error('saveUserSession: data.data is undefined', data);
    return; // jangan lanjut kalau data.data tidak ada
  }

  const {
    _id,
    name,
    username,
    email,
    role,
    outlet,
    outletAccessMode,
    outletAccess,
    roleApproval,
    lastLoginAt,
    accessTokenExpiresAt,
    accessToken,
    token
  } = data;

  const actualToken = accessToken || token;

  // Fallback to embedded user object if fields are not present at top level
  const resolvedOutlet = outlet || data.user?.outlet || '';
  const resolvedOutletAccessMode =
    outletAccessMode || data.user?.outletAccessMode || 'single';
  const resolvedOutletAccess = outletAccess || data.user?.outletAccess || [];

  // Simpan semua info penting dalam 1 object 'user'
  setSessionStorage('user', {
    _id: _id?.toString(), // konversi ke string paksa
    name,
    username,
    email,
    role,
    outlet: resolvedOutlet,
    outletAccessMode: resolvedOutletAccessMode,
    outletAccess: resolvedOutletAccess,
    lastLoginAt,
    accessTokenExpiresAt,
    accessToken: actualToken,
    access: data.access || data.user?.access,
    roleApproval
  });
}
