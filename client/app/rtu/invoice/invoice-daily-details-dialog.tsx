'use client';

import { Store, Hash, FileText } from 'lucide-react';
import { InvoiceDetailsDialog } from './invoice-details-dialog';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { DailyDetailsDialogBase } from '@/components/shared/daily-details-dialog-base';
import { DocumentStatusBadge } from '@/components/ui/document-status-badge';
import { toIDR } from '@/lib/utils';

interface InvoiceDailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  date: string;
  invoices: any[];
}

export function InvoiceDailyDetailsDialog({
  open,
  onOpenChange,
  productName,
  date,
  invoices
}: InvoiceDailyDetailsDialogProps) {
  const totalCost = invoices.reduce((acc, inv) => {
    const item = (inv.items || []).find((i: any) => {
      const isMaterial = !!i.material;
      const pName = isMaterial ? i.material?.name : i.product?.name;
      return pName === productName;
    });
    return acc + (item?.subtotal || 0);
  }, 0);

  return (
    <DailyDetailsDialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Invoice Harian"
      date={date}
      productName={productName}
      summaryLabel="Total Biaya"
      summaryValue={toIDR(totalCost)}
      documentsLabel="Daftar Dokumen"
      items={invoices}
      icon={<FileText className="w-5 h-5" />}
      iconBgClass="bg-indigo-100 text-indigo-600"
      renderItem={(inv) => {
        const item = (inv.items || []).find((i: any) => {
          const isMaterial = !!i.material;
          const pName = isMaterial ? i.material?.name : i.product?.name;
          return pName === productName;
        });
        if (!item) return null;

        return (
          <div
            key={inv._id}
            className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 rounded-sm hover:border-indigo-200 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-indigo-500" />
                  {inv.invoiceNumber}
                </span>
                <DocumentStatusBadge status={inv.status} type="INVOICE" />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <span>{inv.vendor?.name || 'Manual Inbound'}</span>
                <span className="text-gray-300">→</span>
                <span className="font-bold text-gray-800">
                  {inv.outlet?.label || inv.outlet?.name || 'Central Kitchen'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:border-l border-gray-100 sm:pl-4">
              <div className="text-right flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Total Biaya (IDR)
                </p>
                <p className="font-bold text-lg text-gray-900">
                  {toIDR(item.subtotal || 0)}
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-1">
                  {item.qtyInvoiced} {item.unit} x {toIDR(item.unitPrice || 0)}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <InvoiceDetailsDialog invoice={inv} />
                {inv.status === 'DRAFT' && <AddInvoiceDialog invoice={inv} />}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
