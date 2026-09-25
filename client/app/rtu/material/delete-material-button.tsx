'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

export function DeleteMaterialButton({ material }: { material: RTUMaterial }) {
  const { hasPermission: canDelete } = useGetPermission('delete');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await api.delete(`/rtu/material/${material._id}`);
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      toast.success('Material berhasil dihapus!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus Material');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canDelete) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white rounded-sm p-6 shadow-xl border-t-4 border-red-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Konfirmasi Penghapusan
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-600">
            Apakah Anda yakin ingin menghapus Bahan Baku <b>{material.name}</b>?
            Data yang dihapus (termasuk ledger historis) mungkin tidak akan
            ditampilkan lagi di daftar utama.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end space-x-3 pt-6 border-t mt-4 border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="text-gray-600"
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={onDelete}
            className="bg-red-500 hover:bg-red-600 transition-colors shadow-sm text-white"
          >
            {isLoading ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
