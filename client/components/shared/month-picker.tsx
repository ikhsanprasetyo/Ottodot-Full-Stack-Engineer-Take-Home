import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  inputClassName?: string;
  useLabelComponent?: boolean;
  disabled?: boolean;
  save?: boolean;
  saveKey?: string;
}

export function MonthPicker({
  value,
  onChange,
  label = 'Bulan',
  className = 'flex flex-col items-start w-full md:w-auto',
  inputClassName = 'w-40',
  useLabelComponent = true,
  disabled = false,
  save = false,
  saveKey
}: MonthPickerProps) {
  // Load saved setting on mount
  useEffect(() => {
    if (!save) return;
    if (typeof window === 'undefined') return;
    const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
    const key = saveKey || 'month';
    const saved = getLocalStorageSettings(pageKey, key, isString);
    if (saved && saved !== value) {
      onChange(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, saveKey, onChange]);

  return (
    <div className={className}>
      {label &&
        (useLabelComponent ? (
          <Label className="flex items-center text-xs font-bold text-gray-700 mb-1">
            <CalendarDays className="w-3 h-3" />
            {label}
          </Label>
        ) : (
          <span className="block text-xs font-bold text-gray-700 mb-1">
            {label}
          </span>
        ))}
      <div className="flex items-center gap-2 w-full">
        <Input
          type="month"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const newVal = e.target.value;
            onChange(newVal);
            if (save && newVal) {
              const pageKey =
                window.location.pathname.replace(/\/$/, '') || '/';
              const key = saveKey || 'month';
              updateLocalStorageSettings(pageKey, key, newVal);
            }
          }}
          className={`${inputClassName} h-9 bg-white border-gray-300 relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>
    </div>
  );
}
