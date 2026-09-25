'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  debounceMs?: number; // optional kalau mau future-proof
  disabled?: boolean;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  inputClassName,
  debounceMs = 500,
  disabled = false
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const debouncedValue = useDebounce(localValue, debounceMs);

  // sync parent → local (important kalau parent reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // kirim ke parent setelah debounce
  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  const handleClear = useCallback(() => {
    setLocalValue('');
  }, []);

  return (
    <div className={cn('relative w-[260px]', className)}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />

      <Input
        value={localValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleClear();
        }}
        className={cn('pl-8 pr-8 h-8 text-xs', inputClassName)}
      />

      {localValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
