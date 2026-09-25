import type { AllowedAction } from '../type/allowed-action';

export function useGetPermission(
  _action: AllowedAction = 'list',
  _page: string = ''
) {
  return {
    hasPermission: true,
    user: { role: 'admin' },
    pageName: 'dashboard',
    isLoading: false
  };
}
