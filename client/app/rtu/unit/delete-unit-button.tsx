'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import api from '@/lib/api/api';
import { RTUUnit } from '@/lib/type/rtu_unit';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

export function DeleteUnitButton({ unit }: { unit: RTUUnit }) {
  const { hasPermission: canDelete } = useGetPermission('delete', 'rtu_unit');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await api.delete(`/rtu/unit/${unit._id}`);
      await queryClient.invalidateQueries({
        queryKey: ['rtu-units'],
        exact: false
      });
      toast.success('Satuan berhasil dihapus!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus Satuan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canDelete) return null;

  return (
    <>
      <Button
        className="h-6 w-6 p-0 hover:bg-red-50 text-red-500 border-red-200"
        variant="outline"
        size="icon"
        icon={Trash2}
        onClick={() => setOpen(true)}
      />

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Konfirmasi Penghapusan"
        description={`Apakah Anda yakin ingin menghapus Satuan ${unit.name}? Data yang dihapus tidak akan ditampilkan lagi.`}
        onConfirm={onDelete}
        confirmText="Hapus"
        isDestructive={true}
        isLoading={isLoading}
      />
    </>
  );
}
