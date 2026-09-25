'use client';

import { useState, useMemo, Suspense } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import { RTUGRNTable } from './grn-table';
import { AddGRNDialog } from './add-grn-dialog';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { ReusableTitle } from '@/components/ui/reusable-title';
import {
  List,
  Table as TableIcon,
  Package,
  CheckCircle,
  Clock,
  FileText,
  PackageCheck,
  Award,
  Activity
} from 'lucide-react';
import dayjs from 'dayjs';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { MonthPicker } from '@/components/shared/month-picker';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { CountCard } from '@/components/ui/count-card';
import { setDateStr } from '@/lib/date';
import { toIDR } from '@/lib/utils';

import { RTUGRN } from '@/lib/type/rtu_grn';
import { GRNMatrixTable } from './grn-matrix-table';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';
import { useSearchParams } from 'next/navigation';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

function GRNPageContent() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');
  const initialPoId = searchParams.get('poId');
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined'
      ? getLocalStorageSettings('rtu-grn', 'activeTab', isString) || 'table'
      : 'table'
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateLocalStorageSettings('rtu-grn', 'activeTab', val);
  };
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() =>
    typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : ''
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedSellerValue, setSelectedSellerValue] = useState('');

  const { sellerVendorId, sellerOutletId } = useMemo(() => {
    if (
      !selectedSellerValue ||
      selectedSellerValue === 'all' ||
      selectedSellerValue === 'ALL'
    )
      return { sellerVendorId: undefined, sellerOutletId: undefined };
    const [type, id] = selectedSellerValue.split(':');
    return {
      sellerVendorId: type === 'vendor' ? id : undefined,
      sellerOutletId: type === 'seller' ? id : undefined
    };
  }, [selectedSellerValue]);

  const { data, isLoading: isDataLoading } = useGetRTUGRNs();

  const grns = useMemo(() => data?.data || [], [data]);

  // Ambil semua brand unik dari data grns yang dimuat
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    grns.forEach((grn) => {
      grn.items.forEach((item: any) => {
        const b = item.material?.brand;
        if (b && b.trim() !== '') {
          brandsSet.add(b.trim());
        }
      });
    });
    return Array.from(brandsSet).sort();
  }, [grns]);

  const brandOptions = useMemo(() => {
    const options = [{ label: 'Semua Brand', value: 'ALL' }];
    availableBrands.forEach((brand) => {
      options.push({ label: brand, value: brand });
    });
    return options;
  }, [availableBrands]);

  const filteredGrnsForTable = useMemo(() => {
    return grns.filter((item: RTUGRN) => {
      const dateStr = item.receiptDate || item.createdAt;
      if (!dateStr) return false;
      if (dayjs(dateStr).format('YYYY-MM') !== selectedMonth) return false;
      if (selectedOutletId && item.outlet?._id !== selectedOutletId)
        return false;

      // Seller / Vendor Filter
      if (
        sellerVendorId &&
        item.vendorId !== sellerVendorId &&
        item.vendor?._id !== sellerVendorId
      ) {
        return false;
      }
      if (
        sellerOutletId &&
        item.purchase?.sellerId !== sellerOutletId &&
        item.purchase?.seller?._id !== sellerOutletId
      ) {
        return false;
      }

      // Exclude CANCELLED if 'Semua Status' is selected
      if (
        (!statusFilter || statusFilter === 'ALL') &&
        item.status === 'CANCELLED'
      ) {
        return false;
      }

      if (
        statusFilter &&
        statusFilter !== 'ALL' &&
        item.status !== statusFilter
      )
        return false;

      if (brandFilter && brandFilter !== 'ALL') {
        const hasBrand = item.items.some(
          (it: any) => it.material?.brand === brandFilter
        );
        if (!hasBrand) return false;
      }

      return true;
    });
  }, [
    grns,
    selectedMonth,
    selectedOutletId,
    sellerVendorId,
    sellerOutletId,
    statusFilter,
    brandFilter
  ]);

  const cardStats = useMemo(() => {
    let totalGrnAmount = 0;
    let confirmedCount = 0;
    let draftCount = 0;
    let totalGrnCount = 0;
    let totalItemLines = 0;

    filteredGrnsForTable.forEach((grn: RTUGRN) => {
      if (grn.status === 'CANCELLED') return;

      totalGrnAmount += grn.totalAmount || 0;
      totalGrnCount++;

      if (grn.status === 'CONFIRMED') {
        confirmedCount++;
      } else if (grn.status === 'DRAFT') {
        draftCount++;
      }

      if (grn.items && Array.isArray(grn.items)) {
        totalItemLines += grn.items.length;
      }
    });

    return {
      totalGrnAmount,
      confirmedCount,
      draftCount,
      totalGrnCount,
      totalItemLines
    };
  }, [filteredGrnsForTable]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Goods Receipt Note (Penerimaan Barang)"
          subtitle="Kelola penerimaan bahan baku & produk jadi dari vendor untuk update stok otomatis."
          borderColorClass="border-l-indigo-600"
          actions={
            canCreate && (
              <AddGRNDialog
                initialOpen={initialAction === 'create'}
                initialPoId={initialPoId || undefined}
              />
            )
          }
          icon={PackageCheck}
          iconColorClass="text-indigo-400"
        />

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-64"
            label="Cabang Penerima"
            placeholder="Semua Cabang..."
            autoSelectFirst={false}
            save={true}
            saveKey="outletId"
          />
          <OutletSelector
            value={selectedSellerValue}
            onSelect={setSelectedSellerValue}
            className="w-full md:w-64"
            label="Penjual / Vendor"
            placeholder="Semua Penjual / Vendor..."
            autoSelectFirst={false}
            allowAll
            includeVendors={true}
            save={true}
            saveKey="grnSelectedSellerValue"
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
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Dikonfirmasi', value: 'CONFIRMED' },
                { label: 'Dibatalkan', value: 'CANCELLED' }
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="statusFilter"
              icon={Activity}
            />
          </div>
          <div className="w-full md:w-48">
            <ReusableSelect
              label="Brand"
              icon={Award}
              value={brandFilter || 'ALL'}
              onChange={(v) => setBrandFilter(v === 'ALL' ? '' : String(v))}
              options={brandOptions}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={true}
              save={true}
              saveKey="grnBrandFilter"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CountCard
            title="Total Nilai Penerimaan"
            value={toIDR(cardStats.totalGrnAmount)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Package}
            iconClassName="text-blue-600 bg-blue-50"
          />
          <CountCard
            title="GRN Dikonfirmasi"
            value={cardStats.confirmedCount}
            subValue={`/ ${cardStats.totalGrnCount} GRN`}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CheckCircle}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            title="Draft GRN (Outstanding)"
            value={cardStats.draftCount}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Clock}
            iconClassName="text-amber-600 bg-amber-50"
          />
          <CountCard
            title="Total GRN"
            value={cardStats.totalGrnCount}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={FileText}
            iconClassName="text-indigo-600 bg-indigo-50"
          />
        </div>

        <ReusableTabs
          value={activeTab}
          onValueChange={handleTabChange}
          tabs={[
            { value: 'list', label: 'List View', icon: List },
            { value: 'table', label: 'Table', icon: TableIcon }
          ]}
          variant="blue"
          widthClass="md:w-[400px]"
        />

        {activeTab === 'list' && (
          <div className="mt-4">
            <RTUGRNTable
              dataArray={filteredGrnsForTable}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              isLoading={isDataLoading && filteredGrnsForTable.length === 0}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-6 mt-6">
            <GRNMatrixTable
              grns={filteredGrnsForTable}
              isLoading={isDataLoading && filteredGrnsForTable.length === 0}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              selectedMonth={selectedMonth}
              statusFilter={statusFilter}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function GRNPage() {
  return (
    <Suspense fallback={null}>
      <GRNPageContent />
    </Suspense>
  );
}
