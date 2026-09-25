'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ReusableSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  isLoading?: boolean;
  disabled?: boolean;
  id?: string;
}

export function ReusableSwitch({
  checked,
  onChange,
  label,
  description,
  isLoading = false,
  disabled = false,
  id
}: ReusableSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <label id={id} className="text-xs font-bold text-slate-700 block">
          {label}
        </label>
        {description && (
          <span className="text-[10px] text-slate-400 block max-w-xs leading-normal">
            {description}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-6 w-11 bg-gray-100 animate-pulse rounded-sm" />
      ) : (
        <button
          type="button"
          role="switch"
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-sm border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 items-center px-0.5 ${
            checked
              ? 'bg-emerald-600 justify-end hover:bg-emerald-700'
              : 'bg-gray-200 justify-start hover:bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-checked={checked}
          aria-labelledby={id}
        >
          <motion.span
            layout
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30
            }}
            className="pointer-events-none block h-4 w-4 rounded-sm bg-white shadow ring-0"
          />
        </button>
      )}
    </div>
  );
}
