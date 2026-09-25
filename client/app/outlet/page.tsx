'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { OutletTable } from './outlet-table';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { Store } from 'lucide-react';
import {
  getLocalStorageSettings,
  isNumber,
  updateLocalStorageSettings
} from '@/lib/localStorage';

export default function OutletsPage() {
  const [page, setPage] = useState(1);
  const [globalFilter, setGlobalFilter] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const [limit, setLimit] = useState(() => {
    const saved = getLocalStorageSettings('outlets', 'limit', isNumber);
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

  const [sorting, setSorting] = useState<any[]>([
    { id: 'region', desc: true },
    { id: 'createdAt', desc: false }
  ]);

  const [lastTotal, setLastTotal] = useState(0);

  const sortBy =
    lastTotal > limit ? (sorting.length > 0 ? sorting[0].id : '') : '';
  const sortDesc =
    lastTotal > limit ? (sorting.length > 0 ? sorting[0].desc : false) : false;

  const { data, isFetching } = useGetOutlets(
    offset,
    limit,
    debouncedKeyword,
    false, // isDeleted
    sortBy,
    sortDesc
  );

  // Sync lastTotal whenever data changes
  useEffect(() => {
    if (data?.total !== undefined) {
      setLastTotal(data.total);
    }
  }, [data?.total]);

  const outlets = data?.data || [];
  const totalOutlets = data?.total || 0;
  const totalPages = Math.ceil(totalOutlets / limit);

  useEffect(() => {
    updateLocalStorageSettings('outlets', 'limit', limit);
  }, [limit]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <ReusableTitle
          title="Outlet Management (Manajemen Cabang)"
          subtitle="Kelola lokasi cabang / outlet operasional dan lokasi Central Kitchen."
          borderColorClass="border-l-sky-600"
          icon={Store}
          iconColorClass="text-sky-600"
        />
        <OutletTable
          dataArray={outlets}
          offset={offset}
          totalData={totalOutlets}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isFetching}
          limit={limit}
          setLimit={setLimit}
          sorting={sorting}
          setSorting={setSorting}
        />
      </div>
    </DashboardLayout>
  );
}
