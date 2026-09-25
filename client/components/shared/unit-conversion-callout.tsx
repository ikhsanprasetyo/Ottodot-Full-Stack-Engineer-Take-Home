'use client';

import React from 'react';
import { toIDR } from '@/lib/utils';
import { round } from '@/lib/number';

export interface UnitConversionCalloutProps {
  qty: number;
  selectedUnit: string;
  baseUnit: string;
  conversion: number;
  unitPrice?: number;
  mode?: 'IN' | 'OUT';
  className?: string;
}

export function UnitConversionCallout({
  qty = 0,
  selectedUnit,
  baseUnit,
  conversion = 1,
  unitPrice = 0,
  mode = 'IN',
  className = ''
}: UnitConversionCalloutProps) {
  const isMultiUnit = conversion > 1 && selectedUnit !== baseUnit;
  if (!isMultiUnit || qty <= 0) return null;

  const baseQty = round(qty * conversion, 4);
  const basePrice = unitPrice > 0 ? round(unitPrice / conversion, 2) : 0;

  if (mode === 'OUT') {
    return (
      <div
        className={`p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-sm flex items-center justify-between text-xs text-amber-900 shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <span className="bg-amber-200/70 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider">
            Konversi Satuan:
          </span>
          <span>
            <b>
              {qty} {selectedUnit}
            </b>{' '}
            setara dengan
          </span>
        </div>
        <span className="font-bold text-amber-800 bg-white px-2 py-0.5 border border-amber-200 rounded-sm">
          {baseQty.toLocaleString('id-ID')} {baseUnit}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-2 bg-emerald-50/90 border border-emerald-200/80 rounded-sm flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 mt-2 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="bg-emerald-200/70 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
          Konversi Satuan:
        </span>
        <span>
          <b>
            {qty} {selectedUnit}
          </b>{' '}
          ={' '}
          <b className="text-emerald-700">
            {baseQty.toLocaleString('id-ID')} {baseUnit}
          </b>
        </span>
      </div>
      {unitPrice > 0 && (
        <span className="text-[11px] text-emerald-700 font-medium">
          (@ <b>{toIDR(basePrice)}</b> / {baseUnit})
        </span>
      )}
    </div>
  );
}
