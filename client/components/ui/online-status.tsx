'use client';

import React from 'react';
import { Circle } from 'lucide-react';

interface OnlineStatusProps {
  isOnline?: boolean | null;
  className?: string; // opsional untuk styling tambahan
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline = false,
  className = ''
}) => {
  return isOnline ? (
    <span className={`flex items-center gap-1 text-green-600 ${className}`}>
      <Circle className="h-3 w-3 fill-green-600" />
      Online
    </span>
  ) : (
    <span className={`flex items-center gap-1 text-red-600 ${className}`}>
      <Circle className="h-3 w-3 fill-red-600" />
      Offline
    </span>
  );
};
