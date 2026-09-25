'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id'; // ensure indonesian locale if available

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

dayjs.locale('id');

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (date: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string | Date;
  maxDate?: string | Date;
  label?: string | boolean;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = 'Pilih Tanggal',
  disabled = false,
  minDate,
  maxDate,
  label = 'Tanggal'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Internal state for the calendar view
  const [viewDate, setViewDate] = React.useState(
    value ? dayjs(value) : dayjs()
  );

  const selectedDate = value ? dayjs(value) : null;

  const handlePrevMonth = () =>
    setViewDate((prev) => prev.subtract(1, 'month'));
  const handleNextMonth = () => setViewDate((prev) => prev.add(1, 'month'));
  const handlePrevYear = () => setViewDate((prev) => prev.subtract(1, 'year'));
  const handleNextYear = () => setViewDate((prev) => prev.add(1, 'year'));

  const handleSelectDate = (date: dayjs.Dayjs) => {
    if (disabled) return;

    // Check min/max bounds
    if (minDate && date.isBefore(dayjs(minDate), 'day')) return;
    if (maxDate && date.isAfter(dayjs(maxDate), 'day')) return;

    if (onChange) {
      onChange(date.format('YYYY-MM-DD'));
    }
    setIsOpen(false);
  };

  // Generate calendar grid
  const startOfMonth = viewDate.startOf('month');
  const endOfMonth = viewDate.endOf('month');
  const startDate = startOfMonth.startOf('week');
  const endDate = endOfMonth.endOf('week');

  const days: dayjs.Dayjs[] = [];
  let day = startDate;
  while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
    days.push(day);
    day = day.add(1, 'day');
  }

  const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
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

  const displayText = selectedDate
    ? selectedDate.format('DD MMMM YYYY')
    : placeholder;

  return (
    <div className={className}>
      {label !== false && (
        <Label className="flex items-center text-xs font-bold text-gray-700 mb-1 ml-1">
          <CalendarDays className="w-3 h-3 mr-1" />
          {label}
        </Label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal border-gray-200 shadow-sm transition-all h-10',
              'hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white',
              !selectedDate && 'text-gray-400'
            )}
          >
            <CalendarIcon className="mr-3 h-4 w-4 text-emerald-600" />
            <span className="truncate font-semibold tracking-tight">
              {displayText}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 shadow-2xl border-none rounded-xl overflow-hidden bg-white"
          align="start"
        >
          <div className="flex flex-col bg-slate-900 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevYear}
                  className="h-7 w-7 text-gray-300 hover:text-white hover:bg-slate-800 rounded-sm"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <ChevronLeft className="h-3 w-3 -ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 text-gray-300 hover:text-white hover:bg-slate-800 rounded-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="font-black text-sm tracking-wide">
                {MONTHS[viewDate.month()]} {viewDate.year()}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-7 w-7 text-gray-300 hover:text-white hover:bg-slate-800 rounded-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextYear}
                  className="h-7 w-7 text-gray-300 hover:text-white hover:bg-slate-800 rounded-sm"
                >
                  <ChevronRight className="h-3 w-3" />
                  <ChevronRight className="h-3 w-3 -ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-[10px] font-black text-gray-400 tracking-wider"
                >
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const isCurrentMonth = d.month() === viewDate.month();
                const isSelected =
                  selectedDate && d.isSame(selectedDate, 'day');
                const isToday = d.isSame(dayjs(), 'day');

                let isOutsideBounds = false;
                if (minDate && d.isBefore(dayjs(minDate), 'day'))
                  isOutsideBounds = true;
                if (maxDate && d.isAfter(dayjs(maxDate), 'day'))
                  isOutsideBounds = true;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isOutsideBounds}
                    onClick={() => handleSelectDate(d)}
                    className={cn(
                      'h-9 w-9 rounded-sm flex items-center justify-center text-xs font-bold transition-all relative',
                      isOutsideBounds
                        ? 'text-gray-200 cursor-not-allowed'
                        : !isCurrentMonth
                          ? 'text-gray-300 hover:bg-gray-50'
                          : isSelected
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                            : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
                      isToday &&
                        !isSelected &&
                        'border-2 border-emerald-100 text-emerald-600'
                    )}
                  >
                    {d.date()}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today Button Helper */}
          <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold rounded-sm px-6 w-full"
              onClick={() => {
                setViewDate(dayjs());
                handleSelectDate(dayjs());
              }}
            >
              Hari Ini
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
