import React from 'react';
import { cn } from '@/lib/utils';

export interface ReusableSummaryItem {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  borderTop?: boolean;
  borderDashed?: boolean;
  isHighlight?: boolean;
}

interface ReusableSummaryCardProps {
  items: ReusableSummaryItem[];
  className?: string;
  cardClassName?: string;
}

export function ReusableSummaryCard({
  items,
  className,
  cardClassName
}: ReusableSummaryCardProps) {
  return (
    <div
      className={cn(
        'no-print flex-shrink-0 bg-transparent px-6 flex justify-end',
        className
      )}
    >
      <div
        className={cn(
          'w-full md:w-80 border border-emerald-500 bg-emerald-600 p-2 rounded-sm shadow-[0_4px_20px_rgba(16,185,129,0.15)] space-y-0.5',
          cardClassName
        )}
      >
        {items.map((item, index) => {
          const isSeparator = item.borderTop || item.borderDashed;
          const content = (
            <div
              className={cn(
                'flex justify-between items-center text-[10px] font-semibold text-emerald-100 uppercase tracking-wider',
                item.isHighlight && 'text-white',
                item.className
              )}
            >
              <span>{item.label}</span>
              <span className={cn('font-mono text-white', item.valueClassName)}>
                {item.value}
              </span>
            </div>
          );

          return (
            <React.Fragment key={index}>
              {index > 0 && isSeparator && !item.isHighlight && (
                <div
                  className={cn(
                    'mx-1.5 my-0.5 border-t',
                    item.borderDashed
                      ? 'border-dashed border-emerald-500/30'
                      : 'border-emerald-500/50'
                  )}
                />
              )}
              {item.isHighlight ? (
                <div className="bg-emerald-700/80 border border-emerald-800/40 px-1.5 rounded-sm my-0.5">
                  {content}
                </div>
              ) : (
                <div className="py-0.5">{content}</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
