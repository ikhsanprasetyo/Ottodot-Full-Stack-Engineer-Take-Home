'use client';

import { useState, useMemo } from 'react';
import { TableData } from '@/components/ui/table-data';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Store,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { RTUStockLedger } from '@/lib/type/rtu_stock_ledger';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Details Dialogs
import { GRNDetailsDialog } from '../grn/grn-details-dialog';
import { PurchaseDetailsDialog } from '../purchase/purchase-details-dialog';
import { BatchDetailsDialog } from '../production/batch-details-dialog';
import { InvoiceDetailsDialog } from '../invoice/invoice-details-dialog';
import { DistributionDetailsDialog } from '../distribution/distribution-details-dialog';

// Query Hooks
import { useGetRTUGRN } from '@/lib/hooks/queries/rtu-grn';
import { useGetRTUPurchase } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUProductionBatch } from '@/lib/hooks/queries/rtu-production-batch';
import { useGetRTUInvoiceReconcile } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { useGetRTUDistribution } from '@/lib/hooks/queries/rtu-distribution';

interface LedgerTableProps {
  data: RTUStockLedger[];
  isLoading: boolean;
}

interface RefTarget {
  id: string;
  type: string;
  notes?: string;
}

function LedgerRefDetailsModal({
  refTarget,
  onClose
}: {
  refTarget: RefTarget | null;
  onClose: () => void;
}) {
  const targetId = refTarget?.id;
  const rawType = (refTarget?.type || '').toUpperCase();

  const isGRN = Boolean(targetId && rawType.includes('GRN'));
  const isPO = Boolean(
    targetId && (rawType.includes('PO') || rawType.includes('PURCHASE'))
  );
  const isBatch = Boolean(
    targetId && (rawType.includes('BATCH') || rawType.includes('PRODUCTION'))
  );
  const isInvoice = Boolean(targetId && rawType.includes('INV'));
  const isDist = Boolean(
    targetId && (rawType.includes('DIST') || rawType.includes('TRANSFER'))
  );

  const grnQuery = useGetRTUGRN(isGRN ? targetId : undefined);
  const poQuery = useGetRTUPurchase(isPO ? targetId : undefined);
  const batchQuery = useGetRTUProductionBatch(
    isBatch ? targetId : undefined,
    isBatch
  );
  const invQuery = useGetRTUInvoiceReconcile(isInvoice ? targetId : undefined);
  const distQuery = useGetRTUDistribution(isDist ? targetId : undefined);

  if (!refTarget || !targetId) return null;

  const isLoading =
    (isGRN && grnQuery.isLoading) ||
    (isPO && poQuery.isLoading) ||
    (isBatch && batchQuery.isLoading) ||
    (isInvoice && invQuery.isLoading) ||
    (isDist && distQuery.isLoading);

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xs rounded-sm p-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-gray-700">
              Memuat rincian dokumen {refTarget.notes || refTarget.type}...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isGRN) {
    const grnData = grnQuery.data?.data || grnQuery.data;
    if (grnData && grnData._id) {
      return (
        <GRNDetailsDialog
          grn={grnData}
          open={true}
          onOpenChange={(open) => !open && onClose()}
          onClose={onClose}
        />
      );
    }
  }

  if (isPO) {
    const poData = (poQuery.data as any)?.data || poQuery.data;
    if (poData && poData._id) {
      return (
        <PurchaseDetailsDialog
          purchase={poData}
          open={true}
          onOpenChange={(open) => !open && onClose()}
          onClose={onClose}
        />
      );
    }
  }

  if (isBatch) {
    const batchData = batchQuery.data?.data || batchQuery.data;
    if (batchData && batchData._id) {
      return (
        <BatchDetailsDialog
          batch={batchData}
          open={true}
          onOpenChange={(open) => !open && onClose()}
          onClose={onClose}
        />
      );
    }
  }

  if (isInvoice) {
    const invData = invQuery.data?.data || invQuery.data;
    if (invData && invData._id) {
      return (
        <InvoiceDetailsDialog
          invoice={invData}
          open={true}
          onOpenChange={(open) => !open && onClose()}
          onClose={onClose}
        />
      );
    }
  }

  if (isDist) {
    const distData = (distQuery.data as any)?.data || distQuery.data;
    if (distData && distData._id) {
      return (
        <DistributionDetailsDialog
          distribution={distData}
          open={true}
          onOpenChange={(open) => !open && onClose()}
          onClose={onClose}
        />
      );
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-sm p-6 text-center">
        <p className="text-sm font-semibold text-gray-800">
          Dokumen rincian tidak ditemukan
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Dokumen {refTarget.notes || refTarget.type} mungkin telah dihapus atau
          berupa referensi manual.
        </p>
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-sm"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LedgerTable({ data, isLoading }: LedgerTableProps) {
  const [selectedRef, setSelectedRef] = useState<RefTarget | null>(null);

  const getMovementStyle = (type: string) => {
    switch (type) {
      case 'IN':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'OUT':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'ADJUSTMENT':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const columns = useMemo(
    () => [
      {
        header: '#',
        id: 'index',
        cell: (info: any) => (
          <div className="py-0">
            <span className="text-[11px] text-gray-500 font-medium">
              {info.row.index + 1}
            </span>
          </div>
        ),
        size: 15,
        sticky: 'left' as const
      },
      {
        header: 'Entry Date',
        accessorKey: 'createdAt',
        cell: (info: any) => {
          const val = info.getValue();
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-800">
                {dayjs(val).format('DD MMM YYYY')}
              </span>
              <span className="text-[10px] text-gray-400">
                {dayjs(val).format('HH:mm:ss')}
              </span>
            </div>
          );
        }
      },
      {
        header: 'Cabang',
        id: 'outletName',
        accessorFn: (row: any) => row.outlet?.label || row.outlet?.name || '-',
        cell: (info: any) => {
          const row = info.row.original;
          const outletName = row.outlet?.label || row.outlet?.name || '-';
          return (
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-800">
                  {outletName}
                </span>
                {row.outlet?.region && (
                  <span className="text-[10px] text-gray-400">
                    {row.outlet.region}
                  </span>
                )}
              </div>
            </div>
          );
        }
      },
      {
        header: 'Material & Move',
        id: 'materialName',
        accessorFn: (row: any) => row.material?.name,
        cell: (info: any) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-800">
                {row.material?.name}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'w-fit px-1.5 py-0 h-4 text-[9px] font-medium uppercase tracking-wide border',
                  getMovementStyle(row.movementType)
                )}
              >
                {row.movementType === 'IN' ? (
                  <ArrowDownLeft className="w-2.5 h-2.5 mr-0.5" />
                ) : (
                  <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                )}
                {row.movementType}
              </Badge>
            </div>
          );
        }
      },
      {
        header: 'Quantity',
        accessorKey: 'qty',
        align: 'right' as const,
        cell: (info: any) => {
          const row = info.row.original;
          const val = Number(info.getValue()) || 0;
          const isPositive =
            row.movementType === 'IN' ||
            (row.movementType !== 'OUT' && val >= 0);
          const absoluteQty = Math.abs(val);

          return (
            <div className="text-right">
              <span
                className={cn(
                  'text-xs font-bold',
                  isPositive ? 'text-emerald-600' : 'text-gray-700'
                )}
              >
                {isPositive ? '+' : '-'}
                {absoluteQty}
              </span>
              <span className="text-[10px] text-gray-400 ml-1">{row.unit}</span>
            </div>
          );
        }
      },
      {
        header: 'Balance After',
        accessorKey: 'balanceAfter',
        align: 'right' as const,
        cell: (info: any) => {
          const val = info.getValue();
          return (
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-gray-800">{val}</span>
              <span className="text-[9px] text-gray-400 uppercase tracking-wide">
                Stock Balance
              </span>
            </div>
          );
        }
      },
      {
        header: 'Reference Info',
        accessorKey: 'notes',
        cell: (info: any) => {
          const row = info.row.original as RTUStockLedger;
          const isClickable =
            !!row.refId &&
            row.refType !== 'MANUAL' &&
            row.refType !== 'ADJUSTMENT';

          if (isClickable) {
            return (
              <button
                type="button"
                onClick={() =>
                  setSelectedRef({
                    id: row.refId!,
                    type: row.refType,
                    notes: row.notes
                  })
                }
                className="flex flex-col gap-0.5 text-left group cursor-pointer hover:bg-blue-50/80 p-1 -m-1 rounded-sm transition-all border border-transparent hover:border-blue-200/60 w-full"
                title="Klik untuk melihat rincian dokumen"
              >
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-500" />{' '}
                    {row.refType || 'Manual'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </span>
                <span className="text-xs font-semibold text-gray-700 max-w-[200px] truncate group-hover:text-blue-700 underline-offset-2 group-hover:underline">
                  {row.notes || row.refId || 'N/A'}
                </span>
              </button>
            );
          }

          return (
            <div className="flex flex-col gap-0.5 p-1 -m-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-400" />{' '}
                {row.refType || 'Manual'}
              </span>
              <span
                className="text-xs text-gray-600 max-w-[200px] truncate"
                title={row.notes || ''}
              >
                {row.notes || row.refId || 'N/A'}
              </span>
            </div>
          );
        }
      },
      {
        header: 'History',
        id: 'updateHistory',
        cell: (info: any) => {
          const item = info.row.original as RTUStockLedger;
          return (
            <div className="flex items-center py-0">
              <UpdateHistoryCell
                creator={item.creator}
                createdAt={item.createdAt}
              />
            </div>
          );
        }
      }
    ],
    []
  );

  return (
    <>
      <TableData
        data={data || []}
        columns={columns as any}
        isLoading={isLoading}
        globalFilter=""
        setGlobalFilter={() => {}}
        description="Stock movements"
      />

      {selectedRef && (
        <LedgerRefDetailsModal
          refTarget={selectedRef}
          onClose={() => setSelectedRef(null)}
        />
      )}
    </>
  );
}
