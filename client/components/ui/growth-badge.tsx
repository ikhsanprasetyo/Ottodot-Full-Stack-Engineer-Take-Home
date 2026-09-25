import { calculateGrowth } from '@/lib/number';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMemo } from 'react';

type GrowthBadgeProps = {
  current: number;
  last: number;
};

export function GrowthBadge({ current, last }: GrowthBadgeProps) {
  let growth = 0;

  // Business rule:
  // 0 → X = +100%
  growth = useMemo(() => calculateGrowth(current, last), [current, last]);

  const isPositive = growth > 0;
  const isNegative = growth < 0;

  const color = isPositive
    ? 'text-emerald-600 bg-emerald-50'
    : isNegative
      ? 'text-red-600 bg-red-50'
      : 'text-gray-500 bg-gray-100';

  return (
    <div
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${color}`}
    >
      {isPositive && <ArrowUpRight className="w-3 h-3 mr-1" />}
      {isNegative && <ArrowDownRight className="w-3 h-3 mr-1" />}
      {isPositive ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`}
    </div>
  );
}
