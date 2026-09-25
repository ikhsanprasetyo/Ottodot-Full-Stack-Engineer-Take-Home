'use client';

import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { Truck, Store } from 'lucide-react';
import { DistributionDetailsDialog } from './distribution-details-dialog';
import { DailyDetailsDialogBase } from '@/components/shared/daily-details-dialog-base';
import { DocumentStatusBadge } from '@/components/ui/document-status-badge';

interface DistributionDailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  date: string;
  distributions: RTUDistribution[];
}

export function DistributionDailyDetailsDialog({
  open,
  onOpenChange,
  productName,
  date,
  distributions
}: DistributionDailyDetailsDialogProps) {
  const totalQty = distributions.reduce((acc, dist) => {
    const item = dist.items.find((i) => {
      const pName =
        dist.type === 'MATERIAL'
          ? i.material?.brand
            ? `${i.material.name} (${i.material.brand})`
            : i.material?.name
          : i.product?.name;
      return pName === productName;
    });
    return acc + (item?.qty || 0);
  }, 0);

  return (
    <DailyDetailsDialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Pengiriman Harian"
      date={date}
      productName={productName}
      summaryLabel="Total Qty"
      summaryValue={totalQty}
      documentsLabel="Daftar Transaksi"
      items={distributions}
      icon={<Truck className="w-5 h-5" />}
      iconBgClass="bg-blue-100 text-blue-600"
      renderItem={(dist) => {
        const item = dist.items.find((i) => {
          const pName =
            dist.type === 'MATERIAL'
              ? i.material?.brand
                ? `${i.material.name} (${i.material.brand})`
                : i.material?.name
              : i.product?.name;
          return pName === productName;
        });
        if (!item) return null;

        return (
          <div
            key={dist._id}
            className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 rounded-sm hover:border-blue-200 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">
                  {dist.docNumber}
                </span>
                <DocumentStatusBadge status={dist.status} type="DISTRIBUTION" />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <span>{dist.sourceOutlet?.name || 'Central Kitchen'}</span>
                <span className="text-gray-300">→</span>
                <span className="font-bold text-gray-800">
                  {dist.outlet?.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:border-l border-gray-100 sm:pl-4">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">
                  Qty Shipped
                </p>
                <p className="font-bold text-lg text-gray-900">
                  {item.qty}{' '}
                  <span className="text-[10px] uppercase text-gray-500">
                    {item.unit}
                  </span>
                </p>
              </div>
              <DistributionDetailsDialog distribution={dist} />
            </div>
          </div>
        );
      }}
    />
  );
}
