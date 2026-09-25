import React from 'react';
import { cn } from '@/lib/utils';

interface ReusableTitleProps {
  title: string;
  subtitle?: string;
  borderColorClass?: string; // e.g. 'border-l-brand-600' or 'border-l-emerald-500'
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColorClass?: string; // e.g. 'text-indigo-400' or 'text-emerald-400'
}

export const ReusableTitle: React.FC<ReusableTitleProps> = ({
  title,
  subtitle,
  borderColorClass = 'border-l-brand-600',
  actions,
  className,
  icon: Icon,
  iconColorClass = 'text-slate-700'
}) => {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm shadow-sm border border-gray-100 border-l-4 gap-4',
        borderColorClass,
        className
      )}
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          {Icon && <Icon className={cn('w-6 h-6', iconColorClass)} />}
          <span>{title}</span>
        </h2>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};
