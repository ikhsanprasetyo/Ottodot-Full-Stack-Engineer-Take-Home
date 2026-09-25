'use client';

import { useMemo } from 'react';
import { RTUGRN } from '@/lib/type/rtu_grn';
import { Store, Hash } from 'lucide-react';
import { GRNDetailsDialog } from './grn-details-dialog';
import { EditGRNDialog } from './edit-grn-dialog';
import { DeleteGRNButton } from './delete-grn-button';
import { DailyDetailsDialogBase } from '@/components/shared/daily-details-dialog-base';
import { DocumentStatusBadge } from '@/components/ui/document-status-badge';

interface GRNDailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  date: string;
  grns: RTUGRN[];
}

export function GRNDailyDetailsDialog({
  open,
  onOpenChange,
  productName,
  date,
  grns
}: GRNDailyDetailsDialogProps) {
  const { totalQty, unit } = useMemo(() => {
    let q = 0;
    let u = '';
    grns.forEach((grn) => {
      const item = (grn.items || []).find((i) => {
        const isMaterial = !!i.material;
        const pName = isMaterial ? i.material?.name : i.product?.name;
        return pName === productName;
      });
      if (item) {
        q += item.qtyReceived || 0;
        if (!u && item.unit) u = item.unit;
      }
    });
    return { totalQty: q, unit: u };
  }, [grns, productName]);

  return (
    <DailyDetailsDialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Penerimaan Harian (GRN)"
      date={date}
      productName={productName}
      summaryLabel="Total Qty"
      summaryValue={
        <span className="inline-flex items-baseline justify-end gap-1.5">
          <span>{totalQty}</span>
          {unit && (
            <span className="text-sm font-bold uppercase text-gray-500">
              {unit}
            </span>
          )}
        </span>
      }
      documentsLabel="Daftar Dokumen"
      items={grns}
      renderItem={(grn) => {
        const item = (grn.items || []).find((i) => {
          const isMaterial = !!i.material;
          const pName = isMaterial ? i.material?.name : i.product?.name;
          return pName === productName;
        });
        if (!item) return null;

        return (
          <div
            key={grn._id}
            className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 rounded-sm hover:border-blue-200 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  {grn.grnNumber}
                </span>
                <DocumentStatusBadge status={grn.status} type="GRN" />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <span>{grn.vendor?.name || 'Manual Inbound'}</span>
                <span className="text-gray-300">→</span>
                <span className="font-bold text-gray-800">
                  {grn.outlet?.name || grn.outlet?.label || 'Central Kitchen'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:border-l border-gray-100 sm:pl-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Qty Diterima
                </p>
                <p className="font-bold text-lg text-gray-900">
                  {item.qtyReceived}{' '}
                  <span className="text-xs font-semibold text-gray-500">
                    {item.unit}
                  </span>
                </p>
              </div>
              <div className="flex gap-1">
                <GRNDetailsDialog grn={grn} />
                {grn.status === 'CONFIRMED' && (
                  <>
                    <EditGRNDialog grn={grn} />
                    <DeleteGRNButton grnId={grn._id} />
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
