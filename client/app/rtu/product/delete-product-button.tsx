'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import api from '@/lib/api/api';
import { RTUProduct } from '@/lib/type/rtu_product';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

export function DeleteProductButton({ product }: { product: RTUProduct }) {
  const { hasPermission: canDelete } = useGetPermission('delete');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await api.delete(`/rtu/product/${product._id}`);
      await queryClient.invalidateQueries({
        queryKey: ['rtu-products'],
        exact: false
      });
      toast.success('Produk berhasil dihapus!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus Produk');
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
        description={`Apakah Anda yakin ingin menghapus Produk ${product.name}? Data yang dihapus tidak akan ditampilkan lagi.`}
        onConfirm={onDelete}
        confirmText="Hapus"
        isDestructive={true}
        isLoading={isLoading}
      />
    </>
  );
}
