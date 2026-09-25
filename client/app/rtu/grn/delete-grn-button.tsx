'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { DialogBase } from '@/components/ui/dialog-base';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api/api';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

interface DeleteGRNButtonProps {
  grnId: string;
}

export function DeleteGRNButton({ grnId }: DeleteGRNButtonProps) {
  const { hasPermission: canDelete } = useGetPermission('delete');
  const [open, setOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 6) {
      setReasonError('Alasan pembatalan wajib diisi minimal 6 karakter');
      return;
    }
    setReasonError('');
    setIsLoading(true);

    try {
      await api.post(`/rtu/grn/cancel/${grnId}`, { reason: trimmed });
      toast.success('GRN berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['rtu-grns'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      setOpen(false);
      setCancelReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membatalkan GRN');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canDelete) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <DialogBase
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setCancelReason('');
            setReasonError('');
          }
        }}
        title="Batalkan Goods Receipt Note (GRN)"
        description="Tindakan ini tidak dapat dibatalkan. Stok barang akan dikembalikan ke saldo sebelumnya."
        footer={
          <div className="flex w-full justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setCancelReason('');
                setReasonError('');
              }}
              disabled={isLoading}
              className="text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 h-9 rounded-sm"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              isLoading={isLoading}
              onClick={handleDelete}
              disabled={cancelReason.trim().length < 6}
              className="h-9 font-bold rounded-sm"
            >
              Ya, Batalkan GRN
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>Apakah Anda yakin ingin membatalkan penerimaan GRN ini?</p>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-700 mb-1 block">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <FormInput
              placeholder="Contoh: Barang rusak saat penerimaan / kesalahan fisik..."
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (e.target.value.trim().length >= 6) {
                  setReasonError('');
                }
              }}
              error={reasonError}
            />
            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
              <span>Wajib diisi minimal 6 karakter</span>
              <span
                className={
                  cancelReason.trim().length >= 6
                    ? 'text-emerald-600 font-bold'
                    : 'text-amber-600 font-bold'
                }
              >
                {cancelReason.trim().length} / 6 karakter
              </span>
            </div>
          </div>
        </div>
      </DialogBase>
    </>
  );
}
