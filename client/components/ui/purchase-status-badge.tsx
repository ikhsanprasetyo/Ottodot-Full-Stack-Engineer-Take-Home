'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PurchaseStatusBadgeProps {
  status: string;
  isVendor?: boolean;
  qtyPo?: number;
  qtyReceived?: number;
  className?: string;
  paidAmount?: number;
  draftPaidAmount?: number;
  totalAmount?: number;
  hasConfirmedInvoice?: boolean;
}

export function PurchaseStatusBadge({
  status,
  isVendor = false,
  qtyPo,
  qtyReceived,
  className = '',
  paidAmount = 0,
  draftPaidAmount = 0,
  totalAmount = 0,
  hasConfirmedInvoice = false
}: PurchaseStatusBadgeProps) {
  const isPaid = totalAmount > 0 && paidAmount >= totalAmount;
  const isPartiallyPaid =
    totalAmount > 0 && paidAmount > 0 && paidAmount < totalAmount;

  // Draft payment status (if not already fully paid by completed payments)
  const hasDraftPayment = !isPaid && totalAmount > 0 && draftPaidAmount > 0;

  const getBadgeStyle = () => {
    if (isPaid) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50/90';
    }
    if (hasDraftPayment) {
      return 'bg-amber-50 text-amber-700 border-amber-200 border-dashed hover:bg-amber-50/90';
    }
    if (isPartiallyPaid) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50/90';
    }
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50/90';
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50/90';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50/90';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50/90';
    }
  };

  const getPercentSuffix = () => {
    if (status === 'COMPLETED') {
      return ' (100%)';
    }
    if (qtyPo !== undefined && qtyReceived !== undefined && qtyPo > 0) {
      const pct = Math.round((qtyReceived / qtyPo) * 100);
      return ` (${pct}%)`;
    }
    return '';
  };

  const getLabel = () => {
    if (isPaid) {
      return 'Pembayaran Sukses';
    }
    if (hasDraftPayment) {
      const isDraftFullyPaid = paidAmount + draftPaidAmount >= totalAmount;
      return isDraftFullyPaid
        ? 'Pembayaran Belum Ditransfer'
        : 'Dibayar Sebagian Belum Ditransfer';
    }
    if (isPartiallyPaid) {
      return 'Dibayar Sebagian';
    }
    const suffix = getPercentSuffix();
    if (status === 'COMPLETED') {
      return isVendor && hasConfirmedInvoice
        ? `Barang Diterima & Invoice Reconciled${suffix}`
        : `Barang Diterima${suffix}`;
    }
    if (status === 'PROCESSING') {
      return `Diproses${suffix}`;
    }
    if (status === 'CANCELLED') {
      return 'Dibatalkan';
    }
    return (status || 'Draft') + suffix;
  };

  return (
    <Badge
      variant="outline"
      className={`text-[9px] font-bold rounded-sm px-1.5 py-0.5 border inline-block ${getBadgeStyle()} ${className}`}
    >
      {getLabel()}
    </Badge>
  );
}
