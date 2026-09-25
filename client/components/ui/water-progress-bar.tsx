import React from 'react';

type WaterProgressBarProps = {
  value: number; // bisa negatif atau positif
  height?: number; // px
  width?: number; // px (untuk vertical bar)
  colorFrom?: string; // tailwind color atau CSS color
  colorTo?: string;
  label?: string | null;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  invertColor?: boolean;
  decimals?: number; // <--- argumen baru
};

export default function WaterProgressBar({
  value,
  height = 24,
  width = 24,
  colorFrom = '#06b6d4',
  colorTo = '#0ea5a4',
  label = null,
  className = '',
  orientation = 'horizontal',
  invertColor = false,
  decimals = 2 // default 1 angka di belakang koma
}: WaterProgressBarProps) {
  const isNegative = value < 0;

  // Pastikan nilainya aman antara 0–100
  const safeValue = Math.max(0, Math.min(100, Math.abs(Number(value) || 0)));

  // Format persentase dengan desimal
  const formattedValue = Number(value).toFixed(decimals);
  const ariaValueText = `${formattedValue}%`;

  const isHorizontal = orientation === 'horizontal';

  // Container sesuai orientasi
  const containerStyle = isHorizontal
    ? { width: '100%', height }
    : { width, height };

  const fillStyle = isHorizontal
    ? {
        width: safeValue === 0 ? '1px' : `${safeValue}%`,
        height: '100%'
      }
    : {
        width: '100%',
        height: safeValue === 0 ? '1px' : `${safeValue}%`
      };

  // Gradient dengan invertColor
  let gradient: string;
  if (invertColor) {
    gradient = isNegative
      ? isHorizontal
        ? `linear-gradient(90deg, ${colorFrom}, ${colorTo})`
        : `linear-gradient(0deg, ${colorFrom}, ${colorTo})`
      : `linear-gradient(90deg, #f87171, #ef4444)`;
  } else {
    gradient = isNegative
      ? `linear-gradient(90deg, #f87171, #ef4444)`
      : isHorizontal
        ? `linear-gradient(90deg, ${colorFrom}, ${colorTo})`
        : `linear-gradient(0deg, ${colorFrom}, ${colorTo})`;
  }

  return (
    <div className={`${className} flex flex-col items-center w-full`}>
      {/* Label di atas bar */}
      {label !== null && (
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 w-full">
          <span>{label}</span>
          {isHorizontal && (
            <span className="tabular-nums font-mono text-gray-800">
              {ariaValueText}
            </span>
          )}
        </div>
      )}

      {/* Bar container */}
      <div
        role="progressbar"
        aria-valuemin={isNegative ? -100 : 0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        className="relative overflow-hidden rounded-sm bg-gray-600 shadow-inner"
        style={containerStyle}
      >
        {/* Fill bar */}
        <div
          className={`absolute flex ${
            isHorizontal ? 'inset-y-0 left-0' : 'bottom-0 left-0 flex-col'
          } items-center overflow-hidden rounded-sm`}
          style={{
            ...fillStyle,
            transition: 'width 500ms ease-out, height 500ms ease-out'
          }}
        >
          <div
            className="transform-gpu h-full w-full rounded-sm"
            style={{ background: gradient }}
          >
            {/* Water pattern overlay */}
            <div
              className="absolute inset-0 animate-water-pattern rounded-sm"
              aria-hidden
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(255,255,255,0.18) 0 10px, rgba(255,255,255,0.05) 10px 20px)',
                mixBlendMode: 'overlay'
              }}
            />

            {/* Wave SVG */}
            <svg
              className={`absolute opacity-50 animate-wave ${
                isHorizontal
                  ? 'bottom-0 left-0 h-full w-[200%]'
                  : 'left-0 bottom-0 w-full h-[200%]'
              }`}
              style={
                isHorizontal
                  ? { transform: 'translateX(-33%)' }
                  : { transform: 'translateY(-33%)' }
              }
              viewBox="0 0 800 200"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M0 67 C 150 200 350 0 500 67 C 650 140 800 40 1000 67 L 1000 200 L 0 200 Z"
                fill="rgba(255,255,255,0.15)"
              />
            </svg>
          </div>
        </div>

        {/* Horizontal: teks di dalam bar */}
        {isHorizontal && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-xs font-semibold text-white">
            <span className="tabular-nums font-mono">{ariaValueText}</span>
          </div>
        )}
      </div>

      {/* Vertical: teks di bawah bar */}
      {!isHorizontal && (
        <div className="mt-1 text-xs font-semibold tabular-nums">
          <span
            className={`px-0.5 py-0.5 rounded-sm bg-blue-100 font-semibold text-[12px] ${
              (invertColor ? !isNegative : isNegative)
                ? 'text-red-600 bg-red-100'
                : 'text-sky-700'
            }`}
          >
            {ariaValueText}
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes waterFlow {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 200px 0;
          }
        }
        @keyframes waveMove {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-6%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-water-pattern {
          animation: waterFlow 3s linear infinite;
          opacity: 0.95;
        }
        .animate-wave {
          animation: waveMove 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-water-pattern,
          .animate-wave {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
