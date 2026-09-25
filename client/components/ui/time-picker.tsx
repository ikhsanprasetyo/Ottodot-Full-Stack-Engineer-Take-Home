'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TimePickerProps {
  value?: string | null; // e.g. "14:30"
  onChange?: (time: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string | boolean;
}

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = 'Pilih Jam (HH:MM)',
  disabled = false,
  label = 'Waktu'
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const defaultTime = '07:00';
  const [inputValue, setInputValue] = React.useState(value || defaultTime);

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    digits = digits.slice(0, 4);

    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }

    setInputValue(formatted);

    if (digits.length === 4) {
      let h = parseInt(digits.slice(0, 2));
      let m = parseInt(digits.slice(2, 4));

      if (h > 23) h = 23;
      if (m > 59) m = 59;

      const finalStr = `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}`;
      setInputValue(finalStr);
      if (onChange) onChange(finalStr);
    } else if (digits.length === 0) {
      if (onChange) onChange('');
    }
  };

  const handleBlur = () => {
    const digits = inputValue.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 4) {
      let h = digits.slice(0, 2);
      let m = digits.slice(2, 4);

      if (h.length === 1) h = `0${h}`;
      if (h.length === 0) h = '07';

      if (m.length === 1) m = `${m}0`;
      if (m.length === 0) m = '00';

      let parsedH = parseInt(h);
      let parsedM = parseInt(m);
      if (parsedH > 23) parsedH = 23;
      if (parsedM > 59) parsedM = 59;

      const finalStr = `${parsedH.toString().padStart(2, '0')}:${parsedM
        .toString()
        .padStart(2, '0')}`;
      setInputValue(finalStr);
      if (onChange) onChange(finalStr);
    }
  };

  const [hour, minute] = (inputValue || defaultTime).split(':');

  const handleHourSelect = (h: string) => {
    const newVal = `${h}:${minute || '00'}`;
    setInputValue(newVal);
    if (onChange) onChange(newVal);
  };

  const handleMinuteSelect = (m: string) => {
    const newVal = `${hour || '07'}:${m}`;
    setInputValue(newVal);
    if (onChange) onChange(newVal);
  };

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  return (
    <div className={className}>
      {label !== false && (
        <Label className="flex items-center text-xs font-bold text-gray-700 mb-1 ml-1">
          <Clock className="w-3 h-3 mr-1" />
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full pl-3 pr-10 text-bold border-gray-200 shadow-sm transition-all h-10',
            'hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white'
          )}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent text-gray-400 hover:text-emerald-600 rounded-l-none"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 shadow-2xl border-none rounded-xl overflow-hidden bg-white"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex bg-white h-[280px]">
              <ScrollArea className="w-16 h-[280px] border-r border-gray-100">
                <div className="flex flex-col p-1">
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={cn(
                        'text-xs text-bold py-2 text-center rounded-sm transition-all',
                        hour === h
                          ? 'bg-emerald-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <ScrollArea className="w-16 h-[280px]">
                <div className="flex flex-col p-1">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      className={cn(
                        'text-xs text-bold py-2 text-center rounded-sm transition-all',
                        minute === m
                          ? 'bg-emerald-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-black tracking-widest uppercase rounded-sm px-6 w-full"
                onClick={() => setIsOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
