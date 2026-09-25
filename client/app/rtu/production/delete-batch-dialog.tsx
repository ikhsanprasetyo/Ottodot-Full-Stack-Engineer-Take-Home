import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import { useCancelRTUProductionBatch } from '@/lib/hooks/queries/rtu-production-batch';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

interface DeleteBatchDialogProps {
  batch: RTUProductionBatch;
}

export function DeleteBatchDialog({ batch }: DeleteBatchDialogProps) {
  const { hasPermission: canDelete } = useGetPermission('delete');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { mutate: cancelBatch, isPending: isCancelling } =
    useCancelRTUProductionBatch();

  const isReasonValid = reason.trim().length >= 5;

  const handleCancel = () => {
    if (!isReasonValid) return;
    cancelBatch(
      { id: batch._id, reason: reason.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setReason('');
        }
      }
    );
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setReason('');
  };

  if (!canDelete) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 cursor-pointer rounded-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle>Batalkan Batch Produksi?</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <p className="text-sm text-gray-500">
            Batch <strong className="text-gray-900">{batch.batchNumber}</strong>{' '}
            akan dibatalkan. Status akan berubah menjadi{' '}
            <strong>cancelled</strong>.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Masukkan alasan pembatalan (min. 5 karakter)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none rounded-sm"
              rows={3}
            />
            {reason.length > 0 && !isReasonValid && (
              <p className="text-xs text-red-500">Alasan minimal 5 karakter.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="font-bold rounded-sm cursor-pointer"
            onClick={() => handleOpenChange(false)}
            disabled={isCancelling}
          >
            Tutup
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="font-bold rounded-sm cursor-pointer min-w-[120px]"
            disabled={isCancelling || !isReasonValid}
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Batalkan Produksi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
