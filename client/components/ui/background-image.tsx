'use client';

import Image from 'next/image';
import clsx from 'clsx';

interface BackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
}

export function BackgroundImage({
  src,
  alt = '',
  className,
  overlayClassName,
  children
}: BackgroundImageProps) {
  return (
    <div
      className={clsx(
        'relative w-full min-h-screen overflow-x-hidden',
        className
      )}
    >
      {/* Background container - Fixed to viewport to prevent stretching */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          quality={100}
          className="object-cover"
          sizes="100vw"
        />

        {/* Optional overlay */}
        {overlayClassName && (
          <div
            className={clsx(
              'absolute inset-0 pointer-events-none',
              overlayClassName
            )}
          />
        )}
      </div>

      {/* Content di atas background */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
