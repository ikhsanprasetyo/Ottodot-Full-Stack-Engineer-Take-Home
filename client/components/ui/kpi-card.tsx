'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GrowthBadge } from './growth-badge';
import { round } from '@/lib/number';
import { cn } from '@/lib/utils';
import React from 'react';

type KpiCardProps = {
  title: string;
  value?: number;
  unit?: string;
  lastValue?: number;
  locale?: string;

  icon?: React.ElementType;
  iconClassName?: string;
  lastTitle?: string;
};

export function KpiCard({
  title,
  value = 0,
  unit,
  lastValue,
  locale = 'id-ID',
  icon: Icon,
  iconClassName,
  lastTitle = 'Last month'
}: KpiCardProps) {
  const roundedValue = round(value) ?? 0;
  const roundedLastValue = round(lastValue) ?? 0;

  return (
    <Card className="shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-5 space-y-3">
        {/* Title Row */}
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                // default baseline style
                'shrink-0 text-gray-400',
                // allow full override
                iconClassName
              )}
            />
          )}

          <p className="text-xs font-medium text-gray-500 tracking-wider">
            {title}
          </p>
        </div>

        {/* Value Row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-teal-600 flex items-baseline">
              {roundedValue.toLocaleString(locale)}
              {unit && (
                <span className="text-sm font-medium text-gray-400 ml-1">
                  {unit}
                </span>
              )}
            </p>

            {typeof lastValue === 'number' && (
              <p className="text-xs text-gray-400 mt-1">
                {`${lastTitle} `}({roundedLastValue.toLocaleString(locale)}
                {unit ? ` ${unit}` : ''})
              </p>
            )}
          </div>

          {typeof lastValue === 'number' && (
            <GrowthBadge current={value} last={roundedLastValue} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
