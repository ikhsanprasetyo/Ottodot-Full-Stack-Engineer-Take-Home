'use client';

import React from 'react';
import { toIDR } from '@/lib/utils';

export interface DialogFooterSummaryItem {
  label: string;
  /** Raw number or pre-formatted string. If isCurrency is true (default), number will be auto-formatted with toIDR(). */
  value: number | string;
  /** If true, renders as the highlighted grand-total row with a divider above it */
  isHighlight?: boolean;
  /** If true (default), formats numeric value with toIDR(). Set to false for non-currency values (e.g. percentages, counts). */
  isCurrency?: boolean;
  /** Extra CSS classes for the value span. Defaults to 'text-white' */
  valueClassName?: string;
}

interface DialogFooterSummaryProps {
  /** List of summary rows to display on the left */
  items: DialogFooterSummaryItem[];
  /** Action buttons to display on the right */
  children?: React.ReactNode;
  className?: string;
}

/**
 * DialogFooterSummary
 *
 * A combined sticky footer bar for detail dialogs.
 * Displays a stacked totals summary on the left (label | value per row)
 * and action buttons (children) on the right — all in one compact bar.
 *
 * - `isCurrency` defaults to `true` — numeric values are auto-formatted via toIDR().
 * - `valueClassName` defaults to `'text-white'`.
 *
 * Usage:
 * ```tsx
 * <DialogFooterSummary items={[
 *   { label: 'Subtotal', value: subtotal },           // auto toIDR
 *   { label: 'Qty', value: 5, isCurrency: false },    // raw value
 *   { label: 'Total', value: grandTotal, isHighlight: true },
 * ]}>
 *   <Button>Tutup</Button>
 * </DialogFooterSummary>
 * ```
 */
export function DialogFooterSummary({
  items,
  children,
  className = ''
}: DialogFooterSummaryProps) {
  const formatValue = (item: DialogFooterSummaryItem): string => {
    const isCurrency = item.isCurrency !== false; // default true
    if (isCurrency && typeof item.value === 'number') {
      return toIDR(item.value);
    }
    return String(item.value);
  };

  return (
    <div
      className={`no-print flex-shrink-0 border-t border-gray-100 px-6 py-3 flex flex-row items-end justify-between gap-6 rounded-b-sm shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-10 ${className.includes('bg-') || className.includes('from-') ? '' : 'bg-gradient-to-r from-emerald-700 to-emerald-600'} ${className}`}
    >
      {/* Totals — left side, stacked rows */}
      <div className="flex flex-col gap-0.5 text-white min-w-[220px]">
        {items.map((item) =>
          item.isHighlight ? (
            <div
              key={item.label}
              className="flex items-center justify-between gap-8 border-t border-white/20 pt-1 mt-0.5"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {item.label}
              </span>
              <span
                className={`text-base font-bold font-mono ${item.valueClassName ?? 'text-white'}`}
              >
                {formatValue(item)}
              </span>
            </div>
          ) : (
            <div
              key={item.label}
              className="flex items-center justify-between gap-8 opacity-80"
            >
              <span className="text-[10px] font-medium">{item.label}</span>
              <span
                className={`text-[10px] font-bold font-mono ${item.valueClassName ?? 'text-white'}`}
              >
                {formatValue(item)}
              </span>
            </div>
          )
        )}
      </div>

      {/* Action buttons — right side */}
      {children && (
        <div className="flex gap-2 flex-shrink-0 pb-0.5">{children}</div>
      )}
    </div>
  );
}
