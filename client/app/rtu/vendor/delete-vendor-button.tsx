'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import api from '@/lib/api/api';
import { RTUVendor } from '@/lib/type/rtu_vendor';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

export function DeleteVendorButton({ vendor }: { vendor: RTUVendor }) {
  const { hasPermission: canDelete } = useGetPermission('delete');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const onDelete = async () => {
    try {
      await api.delete(`/rtu/vendor/${vendor._id}`);
      await queryClient.invalidateQueries({
        queryKey: ['rtu-vendors'],
        exact: false
      });
      await queryClient.invalidateQueries({
        queryKey: ['rtu-vendor', vendor._id]
      });
      toast.success('Vendor berhasil dihapus!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus Vendor');
    }
  };

  if (!canDelete) return null;

  return (
    <>
      <Button
        className="h-6 w-6 p-0 hover:bg-red-50 text-red-500"
        variant="outline"
        size="icon"
        icon={Trash2}
        onClick={() => setOpen(true)}
      />

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Konfirmasi Penghapusan"
        description={`Apakah Anda yakin ingin menghapus Vendor ${vendor.name}? Data yang dihapus tidak akan ditampilkan lagi.`}
        onConfirm={onDelete}
        confirmText="Hapus"
        isDestructive={true}
      />
    </>
  );
}
