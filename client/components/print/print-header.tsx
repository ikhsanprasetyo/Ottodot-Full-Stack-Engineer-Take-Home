'use client';

import React from 'react';
import { Logo } from '@/components/ui/logo';
import dayjs from 'dayjs';

export interface PrintHeaderProps {
  /** Document title for the badge, e.g. "PURCHASE ORDER (PO)" */
  title?: string;
  /** Document reference number, e.g. "PO-1789032639-ac78" */
  docNumber?: string;
  /** Label for the document date, e.g. "Tanggal PO" */
  dateLabel?: string;
  /** Value for the document date (Date, string, or formatted string) */
  dateValue?: Date | string | null;
  /** Custom company name, defaults to "SINAR UTAMA MIE AYAM SETIAP HARI" */
  companyName?: string;
  /** Extra metadata elements on the right column */
  extraInfo?: React.ReactNode;
  /** Additional container CSS classes */
  className?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  title = 'PURCHASE ORDER (PO)',
  docNumber,
  dateLabel = 'Tanggal PO',
  dateValue,
  companyName = 'SINAR UTAMA MIE AYAM SETIAP HARI',
  extraInfo,
  className = ''
}) => {
  const formattedDate = dateValue
    ? typeof dateValue === 'string' &&
      (dateValue.includes(' ') || dateValue.includes(','))
      ? dateValue
      : dayjs(dateValue).format('DD MMMM YYYY')
    : null;

  return (
    <div
      className={`flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-3 ${className}`}
    >
      <div className="flex flex-col gap-0.5">
        <Logo size="xl" />
        <span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">
          {companyName}
        </span>
      </div>

      <div className="text-right space-y-0.5">
        {title && (
          <div className="inline-block bg-slate-900 text-white px-2.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase font-mono">
            {title}
          </div>
        )}
        {docNumber && (
          <p className="text-xs font-extrabold text-slate-900 font-mono tracking-tight block">
            {docNumber.startsWith('#') ? docNumber : `#${docNumber}`}
          </p>
        )}
        {dateLabel && formattedDate && (
          <p className="text-[9px] text-slate-500 font-medium">
            {dateLabel}:{' '}
            <strong className="text-slate-900">{formattedDate}</strong>
          </p>
        )}
        {extraInfo}
      </div>
    </div>
  );
};

export default PrintHeader;
