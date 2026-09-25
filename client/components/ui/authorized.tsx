import { useGetPermission } from '@/lib/hooks/useGetPermission';
import React from 'react';
import { AllowedAction } from '@/lib/type/allowed-action';

type AuthorizedProps = {
  children: React.ReactNode;
  action?: AllowedAction;
  isLoading?: boolean;
};

export const Authorized: React.FC<AuthorizedProps> = ({
  action = 'list',
  children,
  isLoading = false
}) => {
  const { hasPermission, isLoading: isLoadingPermission } =
    useGetPermission(action);

  // Tunggu hingga permission check selesai — jangan render apapun sebelum ini
  if (isLoadingPermission) return null;

  // Jika permission definitif ditolak (bukan sedang loading data)
  if (!hasPermission && !isLoading && !isLoadingPermission) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Not authorized to view this page
      </div>
    );
  }

  return <>{children}</>;
};
