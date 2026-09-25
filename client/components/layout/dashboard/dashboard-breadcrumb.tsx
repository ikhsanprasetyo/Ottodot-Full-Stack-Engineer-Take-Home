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
import { useGetOutlet } from '@/lib/hooks/queries/outlet';
import { useGetUser } from '@/lib/hooks/queries/user';
import { formatHumanReadableString } from '@/lib/utils';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATIC_MAPPING: Record<string, string> = {
  hrd: 'HRD',
  pr: 'Cust Exp',
  finance: 'Finance',
  operations: 'Operations',
  summary: 'Summary',
  user: 'Users',
  outlet: 'Outlets',
  new: 'Baru'
};

function ResolvedBreadcrumbLabel({
  segment,
  path,
  index
}: {
  segment: string;
  path: string[];
  index: number;
}) {
  const isId = UUID_REGEX.test(segment);
  const parentSegment = index > 0 ? path[index - 1] : '';

  // Hooks MUST be called unconditionally at the top level
  const { data: outletRes } = useGetOutlet(
    isId && parentSegment === 'outlet' ? segment : undefined
  );
  const { data: userRes } = useGetUser(
    isId && (parentSegment === 'user' || parentSegment === 'users')
      ? segment
      : undefined
  );

  // 1. Static Mapping
  if (!isId && STATIC_MAPPING[segment.toLowerCase()]) {
    return STATIC_MAPPING[segment.toLowerCase()];
  }

  // 2. Fallback for non-ID
  if (!isId) {
    return formatHumanReadableString(segment);
  }

  // 3. Dynamic Resolution for IDs
  // Outlet context
  const outlet = outletRes?.data;
  if (parentSegment === 'outlet' && outlet) {
    return outlet.label || outlet.name;
  }

  // User context
  const user = userRes?.data;
  if ((parentSegment === 'user' || parentSegment === 'users') && user) {
    return user.name;
  }

  return '...';
}

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const path = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Sinar Utama</Link>
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
                    <ResolvedBreadcrumbLabel
                      segment={segment}
                      path={path}
                      index={index}
                    />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>
                      <ResolvedBreadcrumbLabel
                        segment={segment}
                        path={path}
                        index={index}
                      />
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
