'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface YearPickerProps {
  value?: string; // Format: "yyyy"
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

export function YearPicker({
  value,
  onChange,
  placeholder = 'Pilih Tahun',
  allowClear = true,
  className
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedYear = React.useMemo(() => {
    if (!value) return undefined;
    return parseInt(value, 10);
  }, [value]);

  const currentYear = dayjs().year();
  const years = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);
  }, [currentYear]);

  const handleSelect = (year: number) => {
    onChange(year.toString());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !selectedYear && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedYear ? (
            <span>{selectedYear}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          {value && allowClear && (
            <div
              className="ml-auto p-1 hover:bg-gray-100 rounded-sm"
              onClick={handleClear}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-2 gap-2">
            {years.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? 'default' : 'ghost'}
                className={cn(
                  'h-9 w-full',
                  selectedYear === year
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : ''
                )}
                onClick={() => handleSelect(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
