import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ToggleOption {
  value: string;
  label: ReactNode;
  icon?: LucideIcon | React.ElementType;
  /** Tailwind classes applied when this option is active */
  activeClassName?: string;
  /** Tailwind classes applied on hover when inactive */
  hoverClassName?: string;
}

interface ButtonToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  icon?: LucideIcon | React.ElementType;
  className?: string;
  height?: string;
}

export function ButtonToggle({
  options,
  value,
  onChange,
  label,
  icon: Icon,
  className,
  height = 'h-9'
}: ButtonToggleProps) {
  return (
    <div className={className}>
      {(label || Icon) && (
        <Label className="flex items-center text-xs font-bold text-gray-700 mb-1 gap-1.5">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </Label>
      )}
      <div className={cn('flex gap-2', height)}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 rounded-sm font-bold text-sm flex items-center justify-center border-2 transition-all cursor-pointer h-9 gap-1.5',
                isActive
                  ? (opt.activeClassName ??
                      'bg-blue-600 border-blue-600 text-white')
                  : cn(
                      'bg-white border-gray-200 text-gray-500',
                      opt.hoverClassName ?? 'hover:border-blue-300'
                    )
              )}
            >
              {OptIcon && <OptIcon className="w-4 h-4" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
