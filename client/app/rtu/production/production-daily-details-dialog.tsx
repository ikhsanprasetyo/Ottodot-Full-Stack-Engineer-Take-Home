'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import {
  Store,
  Calendar,
  FileText,
  CheckCircle2,
  Hash,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFullIDR, formatIndoNumber } from '@/lib/number';
import { BatchDetailsDialog } from './batch-details-dialog';
import { EditBatchDialog } from './edit-batch-dialog';
import { Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { useState } from 'react';
import { toast } from 'sonner';

function DeleteBatchButton({
  batch,
  disabled
}: {
  batch: RTUProductionBatch;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      const res = await api.post(`/rtu/batch/cancel/${batch._id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Production Batch deleted & stock reversed!');
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete batch');
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isDeleting}
      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
      onClick={(e) => {
        e.stopPropagation();
        if (
          confirm(
            'Are you sure you want to delete this batch and reverse the stock?'
          )
        ) {
          deleteMutation.mutate();
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

interface ProductionDailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  date: string;
  productions: RTUProductionBatch[];
}

export function ProductionDailyDetailsDialog({
  open,
  onOpenChange,
  productName,
  date,
  productions
}: ProductionDailyDetailsDialogProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-red-100 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in_progress':
        return <Settings className="w-4 h-4 text-blue-500 animate-spin-slow" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const totalQty = productions.reduce((acc, batch) => {
    const qty = batch.actualQty || 0;
    return acc + qty;
  }, 0);

  const totalCost = productions.reduce((acc, batch) => {
    return acc + (batch.totalCost || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 rounded-sm shadow-2xl border-none">
        <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                Detail Produksi Harian
              </DialogTitle>
              <p className="text-xs text-gray-500 font-bold mt-1">
                {dayjs(date).format('DD MMMM YYYY')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-sm shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                Produk Jadi
              </p>
              <p className="font-bold text-lg text-gray-900 leading-none">
                {productName}
              </p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                  Total Biaya
                </p>
                <p className="font-bold text-lg text-emerald-600 leading-none">
                  {formatFullIDR(totalCost)}
                </p>
              </div>
              <div className="border-l border-gray-200 pl-6">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                  Total Qty
                </p>
                <p className="font-bold text-2xl text-orange-600 leading-none">
                  {formatIndoNumber(totalQty)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              Daftar Batch Produksi ({productions.length} Batch)
            </h4>
            <div className="space-y-3">
              {productions.map((batch) => {
                const qty = batch.actualQty || 0;

                return (
                  <div
                    key={batch._id}
                    className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 rounded-sm hover:border-orange-200 hover:shadow-md transition-all bg-white group"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-orange-500" />
                          {batch.batchNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'px-2 py-0 text-[9px] uppercase font-bold border rounded-sm',
                            getStatusStyle(batch.status)
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(batch.status)}
                            {batch.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Store className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          Resep v{batch.recipeVersion?.versionNumber || '-'}
                        </span>
                        <span className="text-gray-300">→</span>
                        <span className="font-bold text-gray-800">
                          {batch.outlet?.label ||
                            batch.outlet?.name ||
                            'Central Kitchen'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:border-l border-gray-100 sm:pl-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                          Biaya
                        </p>
                        <p className="font-bold text-sm text-emerald-600">
                          {formatFullIDR(batch.totalCost || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                          Qty
                        </p>
                        <p className="font-bold text-lg text-gray-900">
                          {formatIndoNumber(qty)}{' '}
                          <span className="text-[10px] uppercase text-gray-500">
                            {batch.product?.outputUnit}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1 items-center">
                        <BatchDetailsDialog batch={batch} />
                        <EditBatchDialog
                          batch={batch}
                          disabled={batch.status === 'cancelled'}
                        />
                        <DeleteBatchButton
                          batch={batch}
                          disabled={batch.status === 'cancelled'}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-sm font-bold"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
