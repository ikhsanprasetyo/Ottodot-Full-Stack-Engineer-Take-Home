type UserRole = 'user' | 'admin' | 'super admin' | string | null | undefined;

const ADMIN_ROLES = new Set(['admin', 'super admin']);

export function isAdmin(role: UserRole): boolean {
  if (!role || typeof role !== 'string') return false;

  return ADMIN_ROLES.has(role.toLowerCase().trim());
}

export function isSuperAdmin(role: UserRole): boolean {
  if (!role || typeof role !== 'string') return false;
  return role === 'super admin';
}
