'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocumentType =
  'PO' | 'GRN' | 'INVOICE' | 'DISTRIBUTION' | 'PAYMENT';

interface DocumentStatusBadgeProps {
  status: string;
  type: DocumentType;
  className?: string;
  isVendor?: boolean; // For PO
  qtyPo?: number; // For PO % received
  qtyReceived?: number; // For PO % received
  paidAmount?: number; // For PO payment status
  totalAmount?: number; // For PO payment status
  hasConfirmedInvoice?: boolean;
}

export function DocumentStatusBadge({
  status,
  type,
  className = '',
  isVendor = false,
  qtyPo,
  qtyReceived,
  paidAmount = 0,
  totalAmount = 0,
  hasConfirmedInvoice = false
}: DocumentStatusBadgeProps) {
  // PO specific hybrid payment status helper
  const isPaid = type === 'PO' && totalAmount > 0 && paidAmount >= totalAmount;
  const isPartiallyPaid =
    type === 'PO' &&
    totalAmount > 0 &&
    paidAmount > 0 &&
    paidAmount < totalAmount;

  const getStyleAndIcon = () => {
    // 1. PO Payment Hybrid Overrides
    if (isPaid) {
      return {
        style:
          'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        label: 'Pembayaran Sukses'
      };
    }
    if (isPartiallyPaid) {
      return {
        style:
          'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
        icon: <ShoppingCart className="w-3.5 h-3.5" />,
        label: 'Dibayar Sebagian'
      };
    }

    // Normalized Status key
    const normalizedStatus = (status || 'DRAFT').toUpperCase();

    // 2. Mapping based on Type and Status
    switch (type) {
      case 'PO': {
        const pct = (() => {
          if (normalizedStatus === 'COMPLETED') return ' (100%)';
          if (qtyPo !== undefined && qtyReceived !== undefined && qtyPo > 0) {
            return ` (${Math.round((qtyReceived / qtyPo) * 100)}%)`;
          }
          return '';
        })();

        if (normalizedStatus === 'COMPLETED') {
          return {
            style:
              'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            label:
              isVendor && hasConfirmedInvoice
                ? `Barang Diterima & Invoice Reconciled${pct}`
                : `Barang Diterima${pct}`
          };
        }
        if (normalizedStatus === 'PROCESSING') {
          return {
            style:
              'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
            icon: <ShoppingCart className="w-3.5 h-3.5" />,
            label: `Diproses${pct}`
          };
        }
        if (normalizedStatus === 'CANCELLED') {
          return {
            style: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
            icon: <XCircle className="w-3.5 h-3.5" />,
            label: 'Dibatalkan'
          };
        }
        return {
          style: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: `Draft${pct}`
        };
      }

      case 'GRN': {
        if (normalizedStatus === 'CONFIRMED') {
          return {
            style:
              'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
            label: 'CONFIRMED'
          };
        }
        if (normalizedStatus === 'CANCELLED') {
          return {
            style: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
            icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
            label: 'CANCELLED'
          };
        }
        return {
          style: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'DRAFT'
        };
      }

      case 'INVOICE': {
        if (normalizedStatus === 'CONFIRMED') {
          return {
            style:
              'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
            label: 'CONFIRMED'
          };
        }
        if (normalizedStatus === 'CANCELLED') {
          return {
            style: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
            icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
            label: 'CANCELLED'
          };
        }
        return {
          style: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'DRAFT'
        };
      }

      case 'DISTRIBUTION': {
        if (
          normalizedStatus === 'COMPLETED' ||
          normalizedStatus === 'RECEIVED'
        ) {
          return {
            style:
              'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            label: normalizedStatus
          };
        }
        if (
          normalizedStatus === 'SHIPPED' ||
          normalizedStatus === 'PROCESSING'
        ) {
          return {
            style:
              'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
            icon: <Truck className="w-3.5 h-3.5" />,
            label: normalizedStatus
          };
        }
        if (normalizedStatus === 'CANCELLED') {
          return {
            style: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
            icon: <XCircle className="w-3.5 h-3.5" />,
            label: 'CANCELLED'
          };
        }
        return {
          style: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'DRAFT'
        };
      }

      case 'PAYMENT': {
        if (normalizedStatus === 'COMPLETED') {
          return {
            style:
              'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
            label: 'COMPLETED'
          };
        }
        if (normalizedStatus === 'DRAFT') {
          return {
            style:
              'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
            icon: <Clock className="w-3.5 h-3.5 text-orange-500" />,
            label: 'DRAFT'
          };
        }
        return {
          style: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
          icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
          label: normalizedStatus
        };
      }

      default:
        return {
          style: 'bg-gray-50 text-gray-700 border-gray-200',
          icon: <FileText className="w-3.5 h-3.5" />,
          label: status
        };
    }
  };

  const info = getStyleAndIcon();

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-bold rounded-sm px-2 py-0.5 border inline-flex items-center gap-1 whitespace-nowrap shadow-sm transition-colors duration-150',
        info.style,
        className
      )}
    >
      {info.icon}
      <span>{info.label}</span>
    </Badge>
  );
}
