'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactNode } from 'react';

interface CustomTabsProps {
  defaultTab: string;
  tabs: {
    label: string;
    value: string;
    hidden?: boolean;
  }[];
  actions?: ReactNode;
  children?: ReactNode;
}

export default function CustomTabs({
  defaultTab,
  tabs,
  actions,
  children
}: CustomTabsProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <div className="flex items-center">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={tab.hidden ? 'hidden sm:flex' : ''}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {actions && (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
      </div>

      {children}
    </Tabs>
  );
}
