'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Button } from './button';
import { ReusableSelect } from './reusable-select';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

type TablePaginationProps = {
  title: string;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
  offset: number;
  currentCount: number;
  totalCount: number;
  limit?: number;
  setLimit?: (value: number) => void;
};

const LIMIT_OPTIONS = [5, 10, 25, 50, 100, 200].map((t: number) => ({
  label: String(t),
  value: t
}));

export function TablePagination({
  title = '',
  page,
  setPage,
  totalPages,
  offset,
  currentCount,
  totalCount,
  limit,
  setLimit
}: TablePaginationProps) {
  const [inputPageValue, setInputPageValue] = useState(String(page));

  useEffect(() => {
    setInputPageValue(String(page));
  }, [page]);

  if (totalPages === 0) return null;

  // Helper to generate numerical page sequence with ellipses
  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < total) {
          pages.push(i);
        }
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }
    return pages;
  };

  const handleManualPageSubmit = () => {
    const val = parseInt(inputPageValue);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setPage(val);
    } else {
      setInputPageValue(String(page));
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t z-10 flex flex-col md:flex-row items-center w-full justify-between py-3 px-4 gap-4 text-xs text-muted-foreground select-none">
      {/* Showing Information */}
      <div className="font-medium text-slate-500">
        {totalCount === 0 ? (
          <span>Showing 0 of 0 {title ? title.toLowerCase() : 'items'}</span>
        ) : (
          <span>
            Showing{' '}
            <strong className="text-slate-800 font-bold">
              {offset + 1}-{offset + currentCount}
            </strong>{' '}
            of{' '}
            <strong className="text-slate-800 font-bold">{totalCount}</strong>{' '}
            {title ? title.toLowerCase() : 'items'}
          </span>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Limit Selector */}
        {limit && limit < 9999 && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[11px] text-slate-400">Rows per page:</span>
            <ReusableSelect
              options={LIMIT_OPTIONS}
              value={limit || 10}
              onChange={(value: number) => setLimit?.(value)}
              showDefaultSelect
              className="w-[80px]"
              triggerClassName="h-8 px-2 text-xs"
            />
          </div>
        )}

        <div className="flex items-center gap-1 border border-slate-100 rounded-sm p-0.5 bg-slate-50/50">
          {/* First Page */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-sm hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            onClick={() => setPage(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 rounded-sm text-xs hover:bg-slate-100 hover:text-slate-800 gap-1 disabled:opacity-40"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-semibold">Previous</span>
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-0.5 px-1.5 border-l border-r border-slate-200">
            {getPageNumbers(page, totalPages).map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold"
                  >
                    ...
                  </span>
                );
              }
              const isCurrent = p === page;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(Number(p))}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold transition-all duration-150',
                    isCurrent
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 rounded-sm text-xs hover:bg-slate-100 hover:text-slate-800 gap-1 disabled:opacity-40"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline font-semibold">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          {/* Last Page */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-sm hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Manual Page Input */}
        <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-slate-200">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            Go to page:
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputPageValue}
            onChange={(e) => setInputPageValue(e.target.value)}
            onBlur={handleManualPageSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualPageSubmit();
              }
            }}
            className="w-12 h-8 px-1.5 text-center text-xs border border-slate-200 rounded-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white font-bold text-slate-800"
          />
        </div>
      </div>
    </div>
  );
}
