'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import dayjs from 'dayjs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

interface MonthPickerProps {
  month: number; // 1-12 or 0 for "All"
  year: number; // YYYY
  onChange: (month: number, year: number) => void;
  className?: string;
  allowAllMonths?: boolean;
}

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export function MonthPicker({
  month,
  year,
  onChange,
  className,
  allowAllMonths = false
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(year || dayjs().year());

  const handlePrevYear = () => setViewYear((prev) => prev - 1);
  const handleNextYear = () => setViewYear((prev) => prev + 1);

  const handleSelectMonth = (mIndex: number) => {
    onChange(mIndex + 1, viewYear);
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    onChange(0, viewYear);
    setIsOpen(false);
  };

  const displayText =
    month === 0 ? `Semua Bulan ${year}` : `${MONTHS[month - 1]} ${year}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[200px] justify-start text-left font-normal border-gray-200 shadow-sm hover:bg-gray-50 transition-all',
            !month && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 shadow-xl border-gray-100"
        align="start"
      >
        <div className="flex items-center justify-between p-2 border-b bg-gray-50/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevYear}
            className="h-8 w-8 hover:bg-white hover:shadow-sm"
            icon={<ChevronLeft className="h-4 w-4" />}
          />
          <div className="font-bold text-sm text-gray-700 tracking-tight">
            {viewYear}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextYear}
            className="h-8 w-8 hover:bg-white hover:shadow-sm"
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          {allowAllMonths && (
            <Button
              variant={month === 0 && year === viewYear ? 'green' : 'ghost'}
              className={cn(
                'col-span-3 text-xs h-8 font-medium',
                month === 0 && year === viewYear ? '' : 'text-gray-600'
              )}
              onClick={handleSelectAll}
            >
              Semua Bulan
            </Button>
          )}
          {MONTHS.map((m, i) => {
            const isSelected = month === i + 1 && year === viewYear;
            return (
              <Button
                key={m}
                variant={isSelected ? 'green' : 'ghost'}
                className={cn(
                  'text-xs h-10 font-medium transition-all',
                  isSelected
                    ? 'shadow-md scale-105'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                )}
                onClick={() => handleSelectMonth(i)}
              >
                {m.substring(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
