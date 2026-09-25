'use client';

import { Button } from '@/components/ui/button';
import { useEditUser } from '@/lib/hooks/mutation/user';
import { formatHumanReadableString } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { setSessionStorage } from '@/lib/sessionStorage';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';

export function AccessTable({ user }: { user: any }) {
  const { mutate: editUser, isPending } = useEditUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const pages = [
    'dashboard',
    'user',
    'outlet',
    'rtu_vendor',
    'rtu_material',
    'rtu_recipe',
    'rtu_product',
    'rtu_purchase',
    'rtu_grn',
    'rtu_invoice',
    'rtu_payment',
    'rtu_production',
    'rtu_distribution',
    'rtu_report',
    'rtu_ledger',
    'rtu_category',
    'rtu_unit',
    'rtu_settings'
  ];
  const actions = [
    'list',
    'get',
    'create',
    'update',
    'delete',
    'restore',
    'deletePermanently'
  ];

  const [accessForm, setAccessForm] = useState(() => {
    const init: any = {};
    for (const res of pages) {
      init[res] = {};
      for (const act of actions) {
        init[res][act] = user?.access?.[res]?.[act] || false;
      }
    }
    return init;
  });

  // Toggle satu checkbox
  const toggleCheckbox = (res: string, act: string) => {
    setAccessForm((prev: any) => ({
      ...prev,
      [res]: { ...prev[res], [act]: !prev[res][act] }
    }));
  };

  // 🔹 Select/Deselect semua aksi untuk satu kolom
  const toggleSelectAllByAction = (act: string) => {
    const allSelected = pages.every((res) => accessForm[res][act] === true);
    setAccessForm((prev: any) => {
      const updated = { ...prev };
      for (const res of pages) {
        updated[res][act] = !allSelected;
      }
      return updated;
    });
  };

  // 🔹 Select/Deselect semua aksi untuk satu baris (page)
  const toggleSelectAllByPage = (res: string) => {
    const allSelected = actions.every((act) => accessForm[res][act] === true);
    setAccessForm((prev: any) => {
      const updated = { ...prev };
      updated[res] = {};
      for (const act of actions) {
        updated[res][act] = !allSelected;
      }
      return updated;
    });
  };

  // 🔹 Select/Deselect semua checkbox global
  const toggleSelectAll = () => {
    const allSelected = pages.every((res) =>
      actions.every((act) => accessForm[res][act] === true)
    );

    setAccessForm((prev: any) => {
      const updated = { ...prev };
      for (const res of pages) {
        for (const act of actions) {
          updated[res][act] = !allSelected;
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    editUser(
      {
        id: user._id,
        data: { access: accessForm }
      },
      {
        onSuccess: (updatedUser) => {
          const updatedUserData = updatedUser?.data;
          toast.success(
            `User ${updatedUserData?.name || updatedUser?.name} access updated successfully!`
          );

          // Invalidate user profile query to trigger re-check of permissions
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });

          // Sync session storage if updating the current logged-in user
          const currentUser = getUserFromStorage();
          if (currentUser && currentUser._id === user._id) {
            setSessionStorage('user', updatedUserData);
          }
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to update user access'
          );
        }
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <Button type="button" variant="outline" onClick={toggleSelectAll}>
          Toggle Select All
        </Button>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">Page</th>
            {actions.map((act) => (
              <th key={act} className="border px-2 py-1 text-center">
                <div className="flex flex-col items-center gap-1">
                  {formatHumanReadableString(act)}
                  <input
                    type="checkbox"
                    onChange={() => toggleSelectAllByAction(act)}
                    checked={pages.every(
                      (res) => accessForm[res][act] === true
                    )}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pages.map((res) => (
            <tr key={res}>
              <td className="border px-2 py-1 font-medium text-left">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={actions.every(
                      (act) => accessForm[res][act] === true
                    )}
                    onChange={() => toggleSelectAllByPage(res)}
                    className="cursor-pointer"
                  />
                  <span>{formatHumanReadableString(res)}</span>
                </div>
              </td>
              {actions.map((act) => (
                <td key={act} className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={accessForm[res][act]}
                    onChange={() => toggleCheckbox(res, act)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/users')}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={isPending} variant="primary">
          {isPending ? 'Saving...' : 'Save Access'}
        </Button>
      </div>
    </div>
  );
}
