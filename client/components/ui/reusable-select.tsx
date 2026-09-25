'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings
} from '@/lib/localStorage';

type Option<ValueType = string | number | boolean | undefined> = {
  label: string;
  value: ValueType;
};

type ReusableSelectProps<ValueType = string | number | boolean> = {
  label?: string;
  icon?: LucideIcon | React.ElementType;
  value: ValueType;
  onChange: (value: ValueType) => void;
  options: Option<ValueType>[];
  className?: string;
  showDefaultSelect?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  form?: any;
  name?: string;
  save?: boolean;
  saveKey?: string;
};

export function ReusableSelect<ValueType>({
  label,
  icon: Icon,
  value,
  onChange,
  options = [],
  className = '',
  showDefaultSelect = false,
  isLoading = false,
  disabled = false,
  searchable,
  placeholder = '-- Pilih --',
  triggerClassName = '',
  form,
  name,
  save = false,
  saveKey
}: ReusableSelectProps<ValueType>) {
  const [open, setOpen] = React.useState(false);
  const isSearchable =
    searchable !== undefined ? searchable : options.length > 5;

  React.useEffect(() => {
    if (!save) return;
    if (typeof window === 'undefined') return;
    const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
    const key = saveKey || name || label || 'select';

    const validator = (val: unknown): val is any => {
      if (typeof value === 'number')
        return typeof val === 'number' || typeof val === 'string';
      if (typeof value === 'boolean')
        return typeof val === 'boolean' || typeof val === 'string';
      return typeof val === 'string';
    };

    const saved = getLocalStorageSettings(pageKey, key, validator);
    if (saved !== null && saved !== value) {
      if (typeof value === 'number') {
        const num = parseInt(String(saved), 10);
        if (!isNaN(num)) onChange(num as any);
      } else if (typeof value === 'boolean') {
        onChange((String(saved) === 'true') as any);
      } else {
        onChange(saved as any);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, saveKey, name, label, onChange]);

  const error = form?.formState?.errors;
  const fieldError = name
    ? name.split('.').reduce((obj, key) => obj?.[key], error)
    : undefined;
  const errorMessage = fieldError?.message as string | undefined;

  const selectedLabel = options.find((opt) => opt.value === value)?.label || '';

  return (
    <div className={cn('w-full', className)}>
      {(label || Icon) && (
        <Label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isLoading || disabled}
            className={cn(
              'w-full justify-between h-9 px-3 font-normal bg-white hover:bg-accent hover:text-accent-foreground border-gray-300 rounded-sm text-sm active:scale-[0.98] transition-all duration-200 [&>div]:w-full [&>div]:justify-between',
              triggerClassName
            )}
          >
            <span className="truncate">
              {selectedLabel || (showDefaultSelect ? placeholder : 'Pilih...')}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="min-w-[--radix-popover-trigger-width] w-auto max-w-[450px] md:max-w-[500px] p-0 shadow-2xl border border-gray-100"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command className="rounded-sm">
            {isSearchable && (
              <CommandInput
                placeholder={`Cari ${label || 'pilihan'}...`}
                className="h-9"
              />
            )}
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {showDefaultSelect && (
                  <CommandItem
                    value={placeholder}
                    onSelect={() => {
                      const emptyValue =
                        typeof value === 'number' ||
                        typeof value === 'boolean' ||
                        value === undefined
                          ? undefined
                          : value === null
                            ? null
                            : '';
                      onChange(emptyValue as any);
                      if (save) {
                        const pageKey =
                          window.location.pathname.replace(/\/$/, '') || '/';
                        const key = saveKey || name || label || 'select';
                        updateLocalStorageSettings(pageKey, key, emptyValue);
                      }
                      setOpen(false);
                    }}
                    className="text-sm cursor-pointer py-2 font-normal text-gray-400 italic"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 text-brand-600',
                        value === undefined || value === null || value === ''
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {placeholder}
                  </CommandItem>
                )}
                {options.map((opt, index) => (
                  <CommandItem
                    key={`${String(opt.value)}-${index}`}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value as ValueType);
                      if (
                        save &&
                        opt.value !== undefined &&
                        opt.value !== null
                      ) {
                        const pageKey =
                          window.location.pathname.replace(/\/$/, '') || '/';
                        const key = saveKey || name || label || 'select';
                        updateLocalStorageSettings(pageKey, key, opt.value);
                      }
                      setOpen(false);
                    }}
                    className="text-sm cursor-pointer py-2 font-normal"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 text-brand-600',
                        value === opt.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errorMessage && (
        <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
