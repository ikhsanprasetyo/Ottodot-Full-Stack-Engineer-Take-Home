import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ReusableTabItem = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface ReusableTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: ReusableTabItem[];
  variant?: 'emerald' | 'blue';
  widthClass?: string;
  className?: string;
}

export function ReusableTabs({
  value,
  onValueChange,
  tabs,
  variant = 'emerald',
  widthClass = 'md:w-[400px]',
  className
}: ReusableTabsProps) {
  const activeClass =
    variant === 'emerald'
      ? 'data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700'
      : 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700';

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      <TabsList
        className={cn(
          'grid w-full bg-white border border-gray-200',
          widthClass
        )}
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'rounded-sm text-xs font-semibold h-8 transition-colors',
                activeClass
              )}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
