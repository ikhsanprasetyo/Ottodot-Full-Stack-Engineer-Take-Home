'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
  className?: string;
  isCircle?: boolean;
  href?: string;
};

const heightMap = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 52,
  xxl: 64,
  xxxl: 84
};

export const Logo: React.FC<LogoProps> = ({
  size = 'lg',
  className,
  isCircle = false,
  href = '/dashboard'
}) => {
  const targetHeight = heightMap[size];
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_IMAGE || '/logo.webp';

  const content = (
    <div
      className={cn(
        'relative flex items-center justify-center cursor-pointer group select-none shrink-0',
        className,
        isCircle ? 'rounded-full overflow-hidden' : ''
      )}
      style={{ height: targetHeight, width: 'auto' }}
    >
      <img
        src={logoUrl}
        alt="Ottodot Logo"
        style={{ height: targetHeight, width: 'auto', objectFit: 'contain' }}
        className={cn(
          isCircle ? 'rounded-full' : '',
          'group-hover:scale-105 transition-transform duration-200 h-full w-auto object-contain'
        )}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0 focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};
