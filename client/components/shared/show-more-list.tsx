'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

type ShowMoreListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyPlaceholder?: React.ReactNode;
};

export function ShowMoreList<T>({
  items,
  renderItem,
  emptyPlaceholder = <span className="text-[11px] text-gray-400">-</span>
}: ShowMoreListProps<T>) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <>{emptyPlaceholder}</>;
  }

  if (items.length === 1 || expanded) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap gap-1 items-center">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>{renderItem(item, idx)}</React.Fragment>
          ))}
        </div>
        {expanded && items.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="h-auto p-0 px-1 text-[9px] font-bold text-gray-500 hover:text-gray-700 hover:bg-transparent mt-0.5"
          >
            Show less
          </Button>
        )}
      </div>
    );
  }

  const showMoreCount = items.length - 1;

  return (
    <div className="flex flex-col items-start gap-1">
      {renderItem(items[0], 0)}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="h-auto p-0 px-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 mt-0.5"
      >
        Show more ({showMoreCount})
      </Button>
    </div>
  );
}
