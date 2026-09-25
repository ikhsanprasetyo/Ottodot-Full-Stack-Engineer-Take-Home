'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setDateStr } from '@/lib/date';

interface DailyDetailsDialogBaseProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  date: string | Date | null | undefined;
  productName: string;
  summaryLabel: string;
  summaryValue: React.ReactNode;
  documentsLabel: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  icon?: React.ReactNode;
  iconBgClass?: string;
  className?: string;
}

export function DailyDetailsDialogBase<T>({
  open,
  onOpenChange,
  title,
  date,
  productName,
  summaryLabel,
  summaryValue,
  documentsLabel,
  items,
  renderItem,
  icon = <Calendar className="w-5 h-5" />,
  iconBgClass = 'bg-blue-100 text-blue-600',
  className
}: DailyDetailsDialogBaseProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-5xl max-h-[85vh] flex flex-col p-0 rounded-sm shadow-2xl border-none',
          className
        )}
      >
        <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-sm', iconBgClass)}>{icon}</div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                {title}
              </DialogTitle>
              <p className="text-xs text-gray-500 font-bold mt-1">
                {setDateStr(date, 'DD MMMM YYYY')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-sm shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                Item
              </p>
              <p className="font-bold text-lg text-gray-900 leading-none">
                {productName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                {summaryLabel}
              </p>
              <p className="font-bold text-2xl text-gray-900 leading-none">
                {summaryValue}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              {documentsLabel} ({items.length} Dokumen)
            </h4>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <React.Fragment key={idx}>{renderItem(item)}</React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-sm font-bold"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
