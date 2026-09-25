'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUProductionBatches } from '@/lib/hooks/queries/rtu-production-batch';
import { RTUProductionBatchTable } from './production-table';
import { ProductionMatrixTable } from './production-matrix-table';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthPicker } from '@/components/shared/month-picker';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { ReusableTitle } from '@/components/ui/reusable-title';
import {
  Activity,
  List,
  Table as TableIcon,
  Factory,
  BarChart3
} from 'lucide-react';
import { AddBatchDialog } from './add-batch-dialog';
import { MonthlyHppReportView } from './monthly-hpp-report-view';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';

export default function ProductionPage() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined'
      ? getLocalStorageSettings('rtu-production', 'activeTab', isString) ||
        'table'
      : 'table'
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateLocalStorageSettings('rtu-production', 'activeTab', val);
  };
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [selectedOutletId, setSelectedOutletId] = useState<string>(() =>
    typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : ''
  );
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading: isDataLoading } = useGetRTUProductionBatches(
    undefined,
    selectedOutletId
  );

  const batches = useMemo(() => data?.data || [], [data?.data]);

  const filteredBatches = useMemo(() => {
    return batches.filter((item) => {
      if (!item.plannedDate && !item.completedDate) return false;
      const dateStr = item.completedDate || item.plannedDate || item.createdAt;
      const itemMonth = dayjs(dateStr).format('YYYY-MM');
      if (selectedMonth && itemMonth !== selectedMonth) return false;

      // Exclude cancelled if 'Semua Status' is selected
      if (
        (!statusFilter || statusFilter === 'ALL') &&
        item.status === 'cancelled'
      ) {
        return false;
      }

      if (
        statusFilter &&
        statusFilter !== 'ALL' &&
        item.status !== statusFilter
      ) {
        return false;
      }

      return true;
    });
  }, [batches, selectedMonth, statusFilter]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Production Batches (Batch Produksi)"
          subtitle="Monitor proses produksi Central Kitchen & kalkulasi HPP otomatis (Material + Labor + Overhead)."
          borderColorClass="border-l-orange-500"
          actions={canCreate && <AddBatchDialog />}
          icon={Factory}
          iconColorClass="text-orange-400"
        />

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-72"
            label="Cabang Produksi"
            placeholder="Semua Cabang..."
            autoSelectFirst={false}
            save={true}
            saveKey="outletId"
          />
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            save={true}
            saveKey="selectedMonth"
          />

          <div className="w-full md:w-48">
            <ReusableSelect
              label="Status"
              value={statusFilter || 'ALL'}
              onChange={(v) => setStatusFilter(v === 'ALL' ? '' : String(v))}
              options={[
                { label: 'Semua Status', value: 'ALL' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' }
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="statusFilter"
              icon={Activity}
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[580px] bg-white border border-gray-200">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700"
            >
              <List className="w-4 h-4 mr-2" /> List View
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700"
            >
              <TableIcon className="w-4 h-4 mr-2" /> Matrix
            </TabsTrigger>
            <TabsTrigger
              value="monthly-report"
              className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700"
            >
              <BarChart3 className="w-4 h-4 mr-2" /> Laporan HPP Bulanan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <RTUProductionBatchTable
              dataArray={filteredBatches}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              isLoading={isDataLoading && filteredBatches.length === 0}
            />
          </TabsContent>

          <TabsContent value="table" className="space-y-6 mt-6">
            <ProductionMatrixTable
              productions={filteredBatches}
              isLoading={isDataLoading && filteredBatches.length === 0}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="monthly-report" className="space-y-6 mt-6">
            <MonthlyHppReportView
              batches={filteredBatches}
              isLoading={isDataLoading}
              selectedMonth={selectedMonth}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
