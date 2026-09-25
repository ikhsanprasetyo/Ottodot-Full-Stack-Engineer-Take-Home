'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, FileText, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GrnLifecycleStatus = 'COMPLETED' | 'PARTIAL' | 'DRAFT' | 'NONE';
export type InvoiceLifecycleStatus = 'CONFIRMED' | 'DRAFT' | 'NONE';
export type PaymentLifecycleStatus = 'PAID' | 'PARTIAL' | 'DRAFT' | 'UNPAID';

interface DocumentLifecycleBadgesProps {
  grnStatus: GrnLifecycleStatus;
  grnText?: string;
  invoiceStatus: InvoiceLifecycleStatus;
  invoiceText?: string;
  paymentStatus: PaymentLifecycleStatus;
  paymentText?: string;
  className?: string;
}

export function DocumentLifecycleBadges({
  grnStatus,
  grnText,
  invoiceStatus,
  invoiceText,
  paymentStatus,
  paymentText,
  className
}: DocumentLifecycleBadgesProps) {
  // Helper styling for GRN Badge
  const getGrnBadge = () => {
    switch (grnStatus) {
      case 'COMPLETED':
        return {
          style:
            'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: `GRN ${grnText || '✓'}`,
          title: `Penerimaan Barang (GRN): Selesai ${grnText || '100%'}`
        };
      case 'PARTIAL':
        return {
          style:
            'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
          icon: <Clock className="w-3 h-3 text-amber-600" />,
          label: `GRN ${grnText || 'Sebagian'}`,
          title: `Penerimaan Barang (GRN): Diterima Sebagian ${grnText ? `(${grnText})` : ''}`
        };
      case 'DRAFT':
        return {
          style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
          icon: <FileText className="w-3 h-3 text-blue-600" />,
          label: 'GRN Draft',
          title: 'Penerimaan Barang (GRN): Masih Draft'
        };
      default:
        return {
          style: 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
          icon: <Minus className="w-3 h-3 text-gray-400" />,
          label: 'GRN -',
          title: 'Penerimaan Barang (GRN): Belum Ada'
        };
    }
  };

  // Helper styling for Invoice Badge
  const getInvoiceBadge = () => {
    switch (invoiceStatus) {
      case 'CONFIRMED':
        return {
          style:
            'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: `INV ${invoiceText || '✓'}`,
          title: 'Rekonsiliasi Invoice: Dikonfirmasi'
        };
      case 'DRAFT':
        return {
          style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
          icon: <FileText className="w-3 h-3 text-blue-600" />,
          label: 'INV Draft',
          title: 'Rekonsiliasi Invoice: Masih Draft'
        };
      default:
        return {
          style: 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
          icon: <Minus className="w-3 h-3 text-gray-400" />,
          label: 'INV -',
          title: 'Rekonsiliasi Invoice: Belum Ada'
        };
    }
  };

  // Helper styling for Payment Badge
  const getPaymentBadge = () => {
    switch (paymentStatus) {
      case 'PAID':
        return {
          style:
            'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: `PAY ${paymentText || 'Lunas'}`,
          title: 'Pembayaran: Lunas 100%'
        };
      case 'PARTIAL':
        return {
          style:
            'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
          icon: <Clock className="w-3 h-3 text-amber-600" />,
          label: `PAY ${paymentText || 'Sebagian'}`,
          title: 'Pembayaran: DP / Terbayar Sebagian'
        };
      case 'DRAFT':
        return {
          style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
          icon: <FileText className="w-3 h-3 text-blue-600" />,
          label: 'PAY Draft',
          title: 'Pembayaran: Menunggu Konfirmasi Draft'
        };
      default:
        return {
          style: 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
          icon: <Minus className="w-3 h-3 text-gray-400" />,
          label: 'PAY -',
          title: 'Pembayaran: Belum Dibayar'
        };
    }
  };

  const grn = getGrnBadge();
  const inv = getInvoiceBadge();
  const pay = getPaymentBadge();

  return (
    <div className={cn('flex items-center gap-1 whitespace-nowrap', className)}>
      {/* GRN Badge */}
      <Badge
        variant="outline"
        className={cn(
          'rounded-sm text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1 cursor-help transition-colors',
          grn.style
        )}
        title={grn.title}
      >
        {grn.icon}
        <span>{grn.label}</span>
      </Badge>

      {/* Invoice Badge */}
      <Badge
        variant="outline"
        className={cn(
          'rounded-sm text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1 cursor-help transition-colors',
          inv.style
        )}
        title={inv.title}
      >
        {inv.icon}
        <span>{inv.label}</span>
      </Badge>

      {/* Payment Badge */}
      <Badge
        variant="outline"
        className={cn(
          'rounded-sm text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1 cursor-help transition-colors',
          pay.style
        )}
        title={pay.title}
      >
        {pay.icon}
        <span>{pay.label}</span>
      </Badge>
    </div>
  );
}
