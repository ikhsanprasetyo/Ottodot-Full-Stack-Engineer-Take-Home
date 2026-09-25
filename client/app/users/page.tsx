'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetUsers, useGetUserStats } from '@/lib/hooks/queries/user';
import { UsersTable } from './users-table';
import { UserOnlineChart } from './user-online-chart';
import { CountCard } from '@/components/ui/count-card';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { Users, UserPlus } from 'lucide-react';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import {
  getLocalStorageSettings,
  isNumber,
  updateLocalStorageSettings
} from '@/lib/localStorage';
import { SortingState } from '@tanstack/react-table';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [globalFilter, setGlobalFilter] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [limit, setLimit] = useState(() => {
    const saved = getLocalStorageSettings('users', 'limit', isNumber);
    return saved || 10;
  });

  const offset = (page - 1) * limit;

  // ⏱️ Debounce keyword input selama 500ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(globalFilter.trim());
    }, 500);

    return () => clearTimeout(handler);
  }, [globalFilter]);

  const { hasPermission: hasPermissionList } = useGetPermission('list');

  // Track the last total to decide if sorting should be local or server-side
  const [lastTotal, setLastTotal] = useState(0);

  // Convert sorting state for API
  // Optimization: Only send sort to server if we have more than one page of data
  // This prevents the queryKey from changing (and triggering a loader) for small datasets
  const sortParam =
    lastTotal > limit ? (sorting.length > 0 ? sorting[0].id : '') : '';
  const orderParam =
    lastTotal > limit
      ? sorting.length > 0
        ? sorting[0].desc
          ? 'desc'
          : 'asc'
        : ''
      : '';

  const { data, isLoading } = useGetUsers(
    offset,
    limit,
    debouncedKeyword,
    hasPermissionList,
    showDeleted,
    sortParam,
    orderParam
  );

  const { data: statsRes } = useGetUserStats();
  const stats = statsRes?.data || {
    totalUsers: 0,
    onlineUsers: 0,
    newUsers24h: 0
  };

  // Sync lastTotal whenever data changes
  useEffect(() => {
    if (data?.total !== undefined) {
      setLastTotal(data.total);
    }
  }, [data?.total]);

  const users = data?.data || [];
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  useEffect(() => {
    updateLocalStorageSettings('users', 'limit', limit);
  }, [limit]);

  useEffect(() => {
    setPage(1);
  }, [limit, debouncedKeyword, sorting, showDeleted]);

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="w-full space-y-6">
        <ReusableTitle
          title="User Management"
          subtitle="Kelola data akun pengguna, hak akses per-role, serta pemantauan aktivitas online."
          borderColorClass="border-l-emerald-600"
          icon={Users}
          iconColorClass="text-emerald-600"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CountCard
            title="Users Online"
            value={stats.onlineUsers}
            subValue={`/ ${stats.totalUsers} Total`}
            description="Total pengguna aktif saat ini"
            icon={Users}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            title="New Users (24h)"
            value={stats.newUsers24h}
            description="Pendaftaran dalam 24 jam terakhir"
            icon={UserPlus}
            iconClassName="text-sky-600 bg-sky-50"
          />
        </div>
        <UserOnlineChart maxLineValue={stats.totalUsers} />
        <UsersTable
          dataArray={users}
          offset={offset}
          totalData={totalUsers}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isLoading}
          limit={limit}
          setLimit={setLimit}
          showDeleted={showDeleted}
          setShowDeleted={setShowDeleted}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </div>
    </DashboardLayout>
  );
}
