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

const sizeMap = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 64,
  xxl: 80,
  xxxl: 100
};

export const Logo: React.FC<LogoProps> = ({
  size = 'lg',
  className,
  isCircle = false,
  href = '/dashboard'
}) => {
  const imageSize = sizeMap[size];
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_IMAGE || '/logo-full-color.png';

  const content = (
    <div
      className={cn(
        'relative flex items-center justify-center cursor-pointer group select-none shrink-0',
        className,
        isCircle ? 'rounded-full overflow-hidden' : ''
      )}
      style={{ width: imageSize, height: imageSize }}
    >
      <Image
        src={logoUrl}
        alt="Sinar Utama Logo"
        width={imageSize}
        height={imageSize}
        priority
        unoptimized
        className={cn(
          isCircle ? 'rounded-full' : '',
          'group-hover:scale-105 transition-transform duration-200 object-contain'
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
