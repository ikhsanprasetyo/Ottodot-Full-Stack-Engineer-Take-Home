import { useMemo } from 'react';
import { useGetUserProfile } from './queries/user';
import { useGetPageName } from './useGetPageName';
import { isSuperAdmin } from '../utils/role';
import type { AllowedAction } from '../type/allowed-action';

function normalizePageName(rawName: string): string {
  if (!rawName) return 'dashboard';
  const map: Record<string, string> = {
    users: 'user',
    outlet: 'outlet',
    vendor: 'rtu_vendor',
    material: 'rtu_material',
    recipe: 'rtu_recipe',
    product: 'rtu_product',
    grn: 'rtu_grn',
    production: 'rtu_production',
    distribution: 'rtu_distribution',
    purchase: 'rtu_purchase',
    report: 'rtu_report',
    ledger: 'rtu_ledger',
    invoice: 'rtu_invoice',
    payment: 'rtu_payment',
    category: 'rtu_category',
    unit: 'rtu_unit',
    settings: 'rtu_settings'
  };
  return map[rawName] ?? rawName;
}

// Pages that are accessible to any authenticated user regardless of user.access
const PUBLIC_AUTHENTICATED_PAGES = new Set(['dashboard', 'profile']);

export function useGetPermission(
  action: AllowedAction = 'list',
  page: string = ''
) {
  const detectedPageName = useGetPageName();
  const { data: userProfile, isLoading: isUserLoading } = useGetUserProfile();

  const pageName = useMemo(() => {
    const raw = page || detectedPageName || '';
    return normalizePageName(raw.trim());
  }, [page, detectedPageName]);

  const result = useMemo(() => {
    // userProfile is the API wrapper { success: true, data: user }
    const userData: any = (userProfile as any)?.data;

    if (!userData) {
      return { hasPermission: false, user: null };
    }

    // 1. Super Admin always has permission
    if (isSuperAdmin(userData.role)) {
      return { hasPermission: true, user: userData };
    }

    // 2. Dashboard and Profile are open to all logged-in users
    if (PUBLIC_AUTHENTICATED_PAGES.has(pageName)) {
      return { hasPermission: true, user: userData };
    }

    // 3. Check specific access in user.access
    const accessForPage = userData.access?.[pageName];
    const allowed = Boolean(accessForPage?.[action]);

    return {
      hasPermission: allowed,
      user: userData
    };
  }, [userProfile, pageName, action]);

  return {
    hasPermission: result.hasPermission,
    user: result.user,
    pageName,
    isLoading: isUserLoading
  };
}
