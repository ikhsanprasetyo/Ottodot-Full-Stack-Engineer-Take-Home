'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { formatHumanReadableString } from '@/lib/utils';

const STATIC_MAPPING: Record<string, string> = {
  dashboard: 'Dashboard',
  classes: 'Trial Classes',
  roster: 'Student Roster',
  bookings: 'Booking Records',
  user: 'User',
  admin: 'Admin Console'
};

function ResolvedBreadcrumbLabel({ segment }: { segment: string }) {
  if (STATIC_MAPPING[segment.toLowerCase()]) {
    return STATIC_MAPPING[segment.toLowerCase()];
  }
  return formatHumanReadableString(segment);
}

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const path = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Ottodot Tuition</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.map((segment, index) => {
          const href = '/' + path.slice(0, index + 1).join('/');
          const isLast = index === path.length - 1;
          return (
            <div key={href} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>
                    <ResolvedBreadcrumbLabel segment={segment} />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>
                      <ResolvedBreadcrumbLabel segment={segment} />
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
