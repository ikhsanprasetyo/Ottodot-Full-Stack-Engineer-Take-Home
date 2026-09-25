'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPathActive } from '@/lib/utils';

export function NavItem({
  href,
  label = '',
  children,
  isCollapsed = false,
  className
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = isPathActive(pathname, href);

  return (
    <Link
      href={href}
      className={clsx(
        'relative flex h-9 items-center rounded-sm transition-all duration-200 w-full group select-none',
        isCollapsed ? 'justify-center px-0' : 'justify-start px-2.5 gap-2.5',
        isActive
          ? 'text-emerald-400 font-bold'
          : 'text-gray-300 hover:bg-gray-700/70 hover:text-white font-medium',
        className
      )}
    >
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-400 rounded-r-sm shadow-xs" />
      )}
      {children}
      {!isCollapsed && <span className="text-xs truncate">{label}</span>}
      {isActive && !isCollapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-sm bg-emerald-300 animate-pulse" />
      )}
    </Link>
  );
}
