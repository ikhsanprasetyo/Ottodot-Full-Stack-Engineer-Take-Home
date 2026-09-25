'use client';
import React, { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatLabel, cn } from '@/lib/utils';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[!-\/:-@[-`{-~]/, text: 'At least 1 special character' }
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: 'bg-border',
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-amber-500',
    4: 'bg-amber-700',
    5: 'bg-emerald-500'
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: 'Enter a password',
    1: 'Weak password',
    2: 'Medium password!',
    3: 'Strong password!!',
    4: 'Very Strong password!!!'
  } satisfies Record<Exclude<StrengthScore, 5>, string>
} as const;

type FormInputProps = {
  form?: any;
  label?: any;
  icon?: LucideIcon | React.ElementType;
  name?: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  isCurrency?: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onFocus?: (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onBlur?: (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  className?: string;
  rows?: number;
  showStrength?: boolean;
  containerClassName?: string;
  step?: number | string;
  min?: number | string;
  max?: number | string;
  fractionDigits?: number;
  maxFractionDigits?: number;
  suggestedValue?: string;
  error?: string;
};

export const FormInput: React.FC<FormInputProps> = ({
  label,
  icon: Icon,
  name,
  type = 'text',
  value: propValue,
  required = false,
  placeholder,
  disabled = false,
  onChange: propOnChange,
  onFocus: propOnFocus,
  onBlur: propOnBlur,
  className = '',
  rows,
  showStrength = false,
  containerClassName = '',
  step,
  min,
  max,
  fractionDigits,
  maxFractionDigits,
  suggestedValue,
  error: propError,
  form
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [localCurrencyValue, setLocalCurrencyValue] = useState<string>('');
  const isPassword = type === 'password';

  name = name || label;

  const value = form && name ? form.watch(name) : (propValue ?? '');

  const error = form?.formState?.errors;
  const fieldError = name
    ? name.split('.').reduce((obj, key) => obj?.[key], error)
    : undefined;
  const errorMessage = (propError || fieldError?.message) as string | undefined;

  const onChange = (e: any) => {
    if (propOnChange) {
      propOnChange(e);
    }
    if (form && name) {
      form.setValue(name, e.target.value, {
        shouldValidate: true,
        shouldDirty: true
      });
    }
  };

  const calculateStrength = useMemo(() => {
    if (!isPassword) return null;
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(String(value)),
      text: req.text
    }));
    return {
      score: requirements.filter((req) => req.met).length as StrengthScore,
      requirements
    };
  }, [value, isPassword]);

  const inputType =
    isPassword && isVisible ? 'text' : type === 'currency' ? 'text' : type;

  const formatCurrency = React.useCallback(
    (val: number | string) => {
      if (val === undefined || val === null || val === '') return '';
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits:
          fractionDigits !== undefined ? fractionDigits : 0,
        maximumFractionDigits:
          maxFractionDigits !== undefined
            ? maxFractionDigits
            : fractionDigits !== undefined
              ? fractionDigits
              : 5
      }).format(num);
    },
    [fractionDigits, maxFractionDigits]
  );

  // Sync internal state with external value prop
  React.useEffect(() => {
    if (type === 'currency') {
      const formatted = formatCurrency(value);
      const cleanLocal = localCurrencyValue
        .replace(/[^0-9,]/g, '')
        .replace(',', '.');
      const localNum = cleanLocal === '' ? 0 : Number(cleanLocal);
      const numVal =
        value === undefined || value === null || value === ''
          ? 0
          : Number(value);

      const isDifferent =
        localCurrencyValue === '' ||
        localNum !== numVal ||
        isNaN(localNum) ||
        isNaN(numVal);

      if (isDifferent && !localCurrencyValue.endsWith(',')) {
        setLocalCurrencyValue(formatted);
      }
    }
  }, [value, type, localCurrencyValue, formatCurrency]);

  const handleChange = (e: any) => {
    if (type === 'currency') {
      let valStr = e.target.value.replace(/[^0-9,]/g, '');

      // Ensure only one comma
      const parts = valStr.split(',');
      if (parts.length > 2) {
        valStr = parts[0] + ',' + parts.slice(1).join('');
      }

      // Update local view immediately so user can see what they type (like the trailing comma)
      const digitsOnly = parts[0].replace(/\D/g, '');
      const formattedInt = digitsOnly
        ? new Intl.NumberFormat('id-ID').format(Number(digitsOnly))
        : '';
      const display = valStr.includes(',')
        ? `Rp ${formattedInt},${parts[1] || ''}`
        : `Rp ${formattedInt}`;

      setLocalCurrencyValue(display);

      const numValue = valStr === '' ? 0 : Number(valStr.replace(',', '.'));
      onChange?.({
        ...e,
        target: { ...e.target, value: numValue }
      });
      return;
    }

    if (type !== 'number') {
      onChange?.(e);
      return;
    }

    let val = e.target.value;

    // === Kosongkan kalau user hapus semua, jadikan 0
    if (val === '') {
      onChange?.({
        ...e,
        target: { ...e.target, value: 0 }
      });
      return;
    }

    // === Jika user ngetik desimal valid (misal "0." atau "0.5"), biarkan apa adanya
    if (val.startsWith('0.') || val === '0.') {
      onChange?.({
        ...e,
        target: { ...e.target, value: val }
      });
      return;
    }

    // === Hilangkan nol di depan kecuali "0" atau desimal
    if (/^0+\d+$/.test(val)) {
      val = val.replace(/^0+/, '');
      if (e.target) {
        e.target.value = val;
      }
    }

    // === Simpan ke state: parse sebagai number jika valid, atau simpan string mentah kalau masih diketik
    const parsed = isNaN(Number(val)) ? val : Number(val);

    onChange?.({
      ...e,
      target: { ...e.target, value: parsed }
    });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === 'number' || type === 'currency') {
      const valStr = e.target.value;
      if (
        valStr === '0' ||
        valStr === 'Rp 0' ||
        valStr === '0,00' ||
        valStr === '0.00'
      ) {
        e.target.select();
      }
    }
    if (propOnFocus) {
      propOnFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const val = e.target.value;
      if (val === '' || val === '.' || val === '0.') {
        if (e.target) e.target.value = '0';
        onChange?.({
          ...e,
          target: { ...e.target, value: 0 }
        } as any);
      } else {
        const num = Number(val);
        if (e.target) e.target.value = String(num);
        onChange?.({
          ...e,
          target: { ...e.target, value: num }
        } as any);
      }
    } else if (type === 'currency') {
      const formatted = formatCurrency(value);
      setLocalCurrencyValue(formatted);
      if (
        value === '' ||
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
      ) {
        onChange?.({
          ...e,
          target: { ...e.target, value: 0 }
        } as any);
      }
    }
    if (propOnBlur) {
      propOnBlur(e);
    }
  };

  return (
    <div className={cn('mb-4', containerClassName)}>
      {(label || Icon || suggestedValue) && (
        <label
          htmlFor={name}
          className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1"
        >
          <span className="flex items-center gap-1.5">
            {Icon && <Icon className="w-4 h-4" />}
            {label && formatLabel(label)}
          </span>
          {suggestedValue && (
            <button
              type="button"
              onClick={() =>
                form?.setValue(name || '', suggestedValue, {
                  shouldValidate: true,
                  shouldDirty: true
                })
              }
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 transition-colors"
            >
              Gunakan {suggestedValue}
            </button>
          )}
        </label>
      )}
      {rows ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          required={required}
          className={`w-full border px-3 py-2 rounded-sm disabled:bg-gray-300 ${className}`}
        />
      ) : (
        <div className="relative">
          <input
            id={name}
            name={name}
            type={inputType}
            value={
              type === 'currency' ? localCurrencyValue : String(value ?? '')
            }
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required={required}
            step={step}
            min={min}
            max={max}
            inputMode={type === 'currency' ? 'numeric' : undefined}
            className={`w-full border px-3 py-2 rounded-sm disabled:bg-gray-300 ${isPassword ? 'pr-10' : ''} ${className}`}
          />
          {isPassword && (
            <div
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 cursor-pointer"
              onClick={() => setIsVisible((prev) => !prev)}
            >
              {isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
            </div>
          )}
        </div>
      )}

      {/* ==== Password Strength === */}
      {isPassword && showStrength && calculateStrength && (
        <div className="mt-3">
          <div
            className="mb-2 h-1 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={calculateStrength.score}
            aria-valuemin={0}
            aria-valuemax={5}
          >
            <div
              className={`h-full ${
                STRENGTH_CONFIG.colors[calculateStrength.score]
              } transition-all duration-500`}
              style={{ width: `${(calculateStrength.score / 5) * 100}%` }}
            />
          </div>

          <p className="mb-2 text-sm font-medium flex justify-between">
            <span>Must contain:</span>
            <span>
              {
                STRENGTH_CONFIG.texts[
                  Math.min(
                    calculateStrength.score,
                    4
                  ) as keyof typeof STRENGTH_CONFIG.texts
                ]
              }
            </span>
          </p>

          <ul className="space-y-1.5" aria-label="Password requirements">
            {calculateStrength.requirements.map((req, index) => (
              <li key={index} className="flex items-center space-x-2">
                {req.met ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <X size={14} className="text-muted-foreground/80" />
                )}
                <span
                  className={`text-xs ${
                    req.met ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                >
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {errorMessage && (
        <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
