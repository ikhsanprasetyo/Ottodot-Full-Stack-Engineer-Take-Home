'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type ActiveStatusBadgeProps = {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
};

export const ActiveStatusBadge: React.FC<ActiveStatusBadgeProps> = ({
  isActive,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  className
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold border rounded-sm w-fit transition-all duration-150 select-none',
        isActive
          ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-100/10'
          : 'bg-slate-50 text-slate-500 border-slate-200/60 shadow-sm shadow-slate-100/10',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-sm transition-all duration-300 flex-shrink-0',
          isActive
            ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
            : 'bg-slate-400'
        )}
      />
      <span className="leading-none">
        {isActive ? activeLabel : inactiveLabel}
      </span>
    </div>
  );
};
