'use client';

import React from 'react';
import dayjs from 'dayjs';

export interface PrintFooterProps {
  /** Custom print date/timestamp string or Date. Defaults to current date/time formatted as "DD MMMM YYYY, HH:mm:ss WIB" */
  printedAt?: Date | string | null;
  /** Optional text to display on the left side of the footer */
  leftText?: React.ReactNode;
  /** Additional container CSS classes */
  className?: string;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  printedAt,
  leftText,
  className = ''
}) => {
  const formattedTimestamp = printedAt
    ? typeof printedAt === 'string' && printedAt.includes('WIB')
      ? printedAt
      : dayjs(printedAt).format('DD MMMM YYYY, HH:mm:ss [WIB]')
    : dayjs().format('DD MMMM YYYY, HH:mm:ss [WIB]');

  return (
    <div
      className={`po-print-footer border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] font-medium text-slate-400 tracking-widest pb-1 ${className}`}
    >
      <div>{leftText}</div>
      <div className="ml-auto text-right">
        <span>Tanggal cetak dokumen {formattedTimestamp}</span>
      </div>
    </div>
  );
};

export default PrintFooter;
