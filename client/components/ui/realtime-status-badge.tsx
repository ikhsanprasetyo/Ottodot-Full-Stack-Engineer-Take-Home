'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface RealtimeStatusBadgeProps {
  isConnected?: boolean;
  connectedText?: string;
  connectingText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const RealtimeStatusBadge: React.FC<RealtimeStatusBadgeProps> = ({
  isConnected = false,
  connectedText = 'Realtime Connected',
  connectingText = 'Connecting Realtime...',
  size = 'sm',
  className = ''
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border transition-colors',
        isConnected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-amber-50 border-amber-200 text-amber-700',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        'font-bold tracking-wide',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
        )}
      />
      <span>{isConnected ? connectedText : connectingText}</span>
    </div>
  );
};
