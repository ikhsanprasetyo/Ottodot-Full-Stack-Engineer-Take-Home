'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CountCardProps = {
  title: string;
  value: string | number;
  subValue?: string;
  description?: string;
  icon?: React.ElementType;
  iconClassName?: string;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
  action?: React.ReactNode;
  onClick?: () => void;
};

export function CountCard({
  title,
  value,
  subValue,
  description,
  icon: Icon,
  iconClassName,
  className,
  contentClassName,
  compact = false,
  action,
  onClick
}: CountCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300 bg-white',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <CardContent
        className={cn(
          compact ? 'p-3.5' : 'p-5',
          'flex items-start justify-between h-full',
          contentClassName
        )}
      >
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
              {title}
            </p>
            {action}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                compact ? 'text-xl font-bold' : 'text-3xl font-bold',
                'text-slate-800 tracking-tight truncate'
              )}
            >
              {value}
            </span>
            {subValue && (
              <span className="text-xs font-semibold text-gray-400 tracking-tight shrink-0">
                {subValue}
              </span>
            )}
          </div>
          {description && (
            <p
              title={typeof description === 'string' ? description : undefined}
              className="text-[11px] text-gray-400 leading-tight truncate"
            >
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              compact
                ? 'p-2 rounded-sm bg-slate-50 shrink-0 ml-2'
                : 'p-2.5 rounded-sm bg-slate-50 shrink-0 ml-2',
              iconClassName
            )}
          >
            <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', 'shrink-0')} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
