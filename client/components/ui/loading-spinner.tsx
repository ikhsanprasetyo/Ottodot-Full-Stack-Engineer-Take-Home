'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

type LoadingSpinnerProps = {
  size?: number;
  text?: string;
  fullScreen?: boolean;
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 36,
  text = '',
  fullScreen = true
}) => {
  return (
    <div
      className={`${
        fullScreen
          ? 'fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden'
          : 'flex flex-col items-center justify-center min-h-[220px]'
      }`}
    >
      {/* Ultra Blue Aura Background */}
      {fullScreen && (
        <div className="absolute inset-0 animate-fadeIn">
          <div className="absolute top-[35%] left-1/2 w-40 h-40 -translate-x-1/2 rounded-full bg-[#06b6d4]/30 blur-3xl animate-blob" />
          <div className="absolute top-[55%] left-[45%] w-40 h-40 rounded-full bg-[#60A5FA]/30 blur-2xl animate-blob animation-delay-1000" />
          <div className="absolute top-[45%] left-[55%] w-40 h-40 rounded-full bg-[#1E3A8A]/30 blur-2xl animate-blob animation-delay-2000" />
        </div>
      )}

      {/* Spinner */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* glow pulse */}
          <div className="absolute w-24 h-24 rounded-full bg-[#3B82FF]/30 blur-2xl animate-softPulse" />

          <Loader2
            size={size}
            strokeWidth={2.8}
            className="animate-spin text-[#06b6d4] drop-shadow-[0_0_14px_rgba(59,130,255,0.45)]"
          />
        </div>
        {text && (
          <p className="text-sm font-medium text-blue-50 tracking-wide animate-fadeIn">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
