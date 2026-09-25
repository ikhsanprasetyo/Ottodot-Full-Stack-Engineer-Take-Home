import React from 'react';

export interface ConversionUnit {
  unitName: string;
  conversion: number | string;
  /** Accurate-style: intermediate unit this is relative to */
  relativeToUnit?: string;
  /** User-entered value relative to relativeToUnit */
  relativeConversion?: number;
}

export interface ConversionPreviewHubProps {
  baseUnit: string;
  units: ConversionUnit[];
}

export function ConversionPreviewHub({
  baseUnit = 'Unit',
  units = []
}: ConversionPreviewHubProps) {
  const validUnits = units.filter(
    (u) => u.unitName && Number(u.conversion) > 0
  );

  if (validUnits.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-sm text-xs text-blue-800 space-y-1.5">
      <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 block mb-2">
        Preview Konversi Satuan
      </span>

      {validUnits.map((u) => {
        const finalConv = Number(u.conversion);
        const hasIntermediate =
          u.relativeToUnit &&
          u.relativeToUnit !== baseUnit &&
          u.relativeToUnit !== '';
        const relConv =
          typeof u.relativeConversion === 'number'
            ? u.relativeConversion
            : parseFloat(
                String(u.relativeConversion ?? '').replace(',', '.')
              ) || 0;
        const displayRelConv = relConv > 0 ? relConv : finalConv;

        return (
          <div
            key={u.unitName}
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 py-0.5 border-b border-blue-100/50 last:border-0"
          >
            <span className="font-bold">1 {u.unitName}</span>
            <span>=</span>
            <span className="font-bold">
              {displayRelConv.toLocaleString('id-ID', {
                maximumFractionDigits: 6
              })}
            </span>
            <span className="font-bold">
              {hasIntermediate ? u.relativeToUnit : baseUnit}
            </span>

            {hasIntermediate && (
              <>
                <span className="text-blue-400 mx-0.5">→</span>
                <span className="text-blue-600 font-mono bg-blue-100 rounded-sm px-1">
                  ={' '}
                  {finalConv.toLocaleString('id-ID', {
                    maximumFractionDigits: 6
                  })}{' '}
                  {baseUnit}
                </span>
              </>
            )}

            {!hasIntermediate && (
              <span className="text-blue-400 font-mono ml-1">
                (
                {finalConv.toLocaleString('id-ID', {
                  maximumFractionDigits: 6
                })}{' '}
                {baseUnit})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
