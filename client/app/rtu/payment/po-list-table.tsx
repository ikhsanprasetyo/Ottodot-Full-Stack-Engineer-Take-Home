'use client';

import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';
import { Button } from '@/components/ui/button';
import { PurchaseStatusBadge } from '@/components/ui/purchase-status-badge';
import { PurchaseDetailsDialog } from '../purchase/purchase-details-dialog';
import { toIDR } from '@/lib/utils';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

interface POListTableProps {
  purchases: any[];
  paidAmounts: Record<string, number>;
  invoiceTotals?: Record<string, number>;
  onPay?: (purchase: any, isDpVal?: boolean) => void;
  type: 'unpaid' | 'partially_paid' | 'paid';
  isLoading: boolean;
}

export const calculatePoTotal = (po: any) => {
  if (!po.items || !Array.isArray(po.items)) return 0;
  const subtotal = po.items.reduce((sum: number, item: any) => {
    const qty = item.qty || 0;
    const price = item.unitPrice || 0;
    const discount = item.discount || 0;
    return sum + qty * price * (1 - discount / 100);
  }, 0);
  const tax = po.taxPercent ? (subtotal * po.taxPercent) / 100 : 0;
  const shipping = po.shippingFee || 0;
  const loading = po.loadingFee || 0;
  const unloading = po.unloadingFee || 0;
  const additional = (po.additionalCosts || []).reduce(
    (acc: number, c: any) => acc + (c.amount || 0),
    0
  );
  return subtotal + tax + shipping + loading + unloading + additional;
};

export function POListTable({
  purchases,
  paidAmounts,
  invoiceTotals = {},
  onPay,
  type,
  isLoading
}: POListTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedPoDetails, setSelectedPoDetails] = useState<any | null>(null);

  const getEffectiveTotal = (po: any): number =>
    invoiceTotals[po._id] ?? calculatePoTotal(po);

  const hasInvoice = (po: any): boolean => po._id in invoiceTotals;

  const filteredPurchases = useMemo(() => {
    return purchases.filter((po: any) => {
      if (po.status === 'CANCELLED') return false;

      const total = getEffectiveTotal(po);
      const paid = paidAmounts[po._id] || 0;
      const remaining = total - paid;

      // A PO is eligible for payment listing if it is active (COMPLETED or PROCESSING status)
      const isEligible =
        po.status === 'COMPLETED' || po.status === 'PROCESSING';

      if (!isEligible) return false;

      if (type === 'unpaid') return paid === 0 && remaining > 0;
      if (type === 'partially_paid') return paid > 0 && remaining > 0;
      return remaining <= 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, paidAmounts, invoiceTotals, type]);

  const columns = useMemo((): ExtendedColumnDef<any>[] => {
    const cols: ExtendedColumnDef<any>[] = [
      {
        id: 'docNumber',
        accessorKey: 'docNumber',
        header: 'No. Dokumen',
        size: 160,
        noWrap: true,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-mono text-[11px] font-bold text-gray-700">
              {row.original.docNumber}
            </span>
          </div>
        )
      },
      {
        id: 'requestDate',
        accessorKey: 'requestDate',
        header: 'Tgl. Request',
        size: 120,
        noWrap: true,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="text-xs text-gray-600">
              {dayjs(row.original.requestDate).format('DD MMM YYYY')}
            </span>
          </div>
        )
      },
      {
        id: 'buyer',
        header: 'Pembeli',
        size: 140,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="text-xs font-bold text-gray-800">
              {row.original.buyer?.label || '-'}
            </span>
          </div>
        )
      },
      {
        id: 'seller',
        header: 'Penjual / Vendor',
        size: 150,
        cell: ({ row }) => {
          const po = row.original;
          const sellerName = po.seller?.name || po.vendor?.name || '-';
          const sellerSub = po.seller
            ? po.seller.label
            : po.vendor
              ? `Vendor • ${po.vendor.code}`
              : '';
          return (
            <div className="flex flex-col justify-center py-1 min-h-[20px]">
              <span className="text-xs font-bold text-gray-800">
                {sellerName}
              </span>
              {sellerSub && (
                <div className="text-[9px] text-gray-500 font-normal">
                  {sellerSub}
                </div>
              )}
            </div>
          );
        }
      },
      {
        id: 'totalInvoice',
        header: 'Total Invoice',
        size: 140,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => {
          const po = row.original;
          const total = getEffectiveTotal(po);
          const fromInvoice = hasInvoice(po);
          return (
            <div className="flex flex-col justify-center py-1 min-h-[20px] text-right w-full">
              <div className="text-xs font-bold text-gray-800">
                {toIDR(total)}
              </div>
              {fromInvoice ? (
                <div className="text-[9px] text-emerald-600 font-normal mt-0.5">
                  dari invoice
                </div>
              ) : (
                <div className="text-[9px] text-amber-500 font-normal mt-0.5">
                  estimasi PO
                </div>
              )}
            </div>
          );
        }
      },
      {
        id: 'paid',
        header: 'Terbayar',
        size: 130,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => {
          const paid = paidAmounts[row.original._id] || 0;
          return (
            <div className="flex items-center justify-end py-1 min-h-[20px]">
              <span className="text-xs font-bold text-emerald-700">
                {toIDR(paid)}
              </span>
            </div>
          );
        }
      }
    ];

    if (type !== 'paid') {
      cols.push({
        id: 'remaining',
        header: 'Sisa Tagihan',
        size: 130,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => {
          const po = row.original;
          const total = getEffectiveTotal(po);
          const paid = paidAmounts[po._id] || 0;
          const remaining = total - paid;
          return (
            <div className="flex items-center justify-end py-1 min-h-[20px]">
              <span className="text-xs font-bold text-red-600">
                {toIDR(remaining)}
              </span>
            </div>
          );
        }
      });
    }

    cols.push({
      id: 'statusPO',
      header: 'Status PO',
      size: 120,
      align: 'center',
      enableSorting: false,
      cell: ({ row }) => {
        const po = row.original;
        const total = getEffectiveTotal(po);
        const paid = paidAmounts[po._id] || 0;
        return (
          <div className="flex items-center justify-center py-1 min-h-[20px]">
            <PurchaseStatusBadge
              status={po.status}
              isVendor={!!po.vendor}
              paidAmount={paid}
              totalAmount={total}
              hasConfirmedInvoice={hasInvoice(po)}
            />
          </div>
        );
      }
    });

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, paidAmounts, invoiceTotals]);

  const renderActions = useMemo(() => {
    return function RenderPOActions(po: any) {
      const showPay = type !== 'paid' && onPay;
      return (
        <div className="flex items-center justify-center gap-1.5 py-1 min-h-[20px]">
          <Button
            variant="ghost"
            size="icon"
            icon={Eye}
            className="h-8 w-8 p-0 rounded-sm hover:bg-gray-200 text-gray-600 animate-none transition-colors"
            type="button"
            title="Lihat Detail PO"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPoDetails(po);
            }}
          />
          {showPay && (
            <Button size="sm" variant="primary" onClick={() => onPay(po)}>
              Bayar
            </Button>
          )}
        </div>
      );
    };
  }, [type, onPay]);

  return (
    <>
      <TableData
        data={filteredPurchases}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        hidePagination
        renderActions={renderActions}
        actionsColumnSize={type === 'paid' ? 80 : 220}
        noDataMessage={
          type === 'unpaid'
            ? 'Tidak ada PO yang belum dibayar'
            : type === 'partially_paid'
              ? 'Tidak ada PO yang dibayar sebagian'
              : 'Tidak ada PO yang sudah lunas'
        }
      />
      {selectedPoDetails && (
        <PurchaseDetailsDialog
          purchase={
            purchases.find((p: any) => p._id === selectedPoDetails._id) ||
            selectedPoDetails
          }
          open={!!selectedPoDetails}
          onOpenChange={(v) => !v && setSelectedPoDetails(null)}
          onClose={() => setSelectedPoDetails(null)}
        />
      )}
    </>
  );
}
