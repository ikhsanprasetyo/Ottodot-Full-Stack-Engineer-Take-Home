'use client';

import { useState, useMemo } from 'react';
import { SortingState } from '@tanstack/react-table';
import {
  Download,
  AlertTriangle,
  Tags,
  ShoppingBasket,
  Package,
  CheckCircle,
  DollarSign
} from 'lucide-react';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { TableData } from '@/components/ui/table-data';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/utils/excel-export';
import { MaterialLotsDialog } from './material-lots-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import WaterProgressBar from '@/components/ui/water-progress-bar';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { CountCard } from '@/components/ui/count-card';
import { toIDR } from '@/lib/utils';

export default function MaterialStockPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tabValue, setTabValue] = useState<'all' | 'above' | 'below'>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false }
  ]);

  const { data, isLoading: isDataLoading } = useGetRTUMaterials(
    globalFilter,
    true, // only active materials
    undefined,
    selectedOutletId,
    selectedCategory
  );

  const { data: categoriesData } = useGetRTUCategories('', true);
  const categories = categoriesData?.data || [];

  const materials = data?.data;

  const stats = useMemo(() => {
    const list = materials || [];
    let totalValuation = 0;
    list.forEach((m: any) => {
      const stock = Number(m.currentStock || 0);
      const price = Number(m.currentPrice || 0);
      totalValuation += stock * price;
    });
    return { totalValuation };
  }, [materials]);

  // Filter materials based on the selected tab
  const filteredMaterials = useMemo(() => {
    const list = materials || [];
    return list.filter((m: any) => {
      if (tabValue === 'above') {
        return m.currentStock >= m.minStock;
      }
      if (tabValue === 'below') {
        return m.currentStock < m.minStock;
      }
      return true;
    });
  }, [materials, tabValue]);

  // Filter materials below minimum stock (for alerts count)
  const lowStockMaterials = useMemo(() => {
    const list = materials || [];
    return list.filter((m: any) => m.currentStock < m.minStock);
  }, [materials]);

  const columns = [
    {
      header: '#',
      id: 'index',
      cell: (info: any) => (
        <div className="py-0">
          <span className="text-[11px] text-gray-500 font-medium">
            {info.row.index + 1}
          </span>
        </div>
      ),
      size: 15,
      sticky: 'left' as const
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-medium text-[11px] text-gray-800 tracking-tight">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-medium text-[11px] text-gray-900">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Brand',
      accessorKey: 'brand',
      cell: (info: any) => (
        <div className="py-0">
          <span className="text-[11px] text-gray-600 font-medium">
            {info.getValue() || '-'}
          </span>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-semibold text-[11px] text-gray-700">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Stock',
      accessorKey: 'currentStock',
      cell: (info: any) => {
        const stock = info.getValue() as number;
        const minStock = info.row.original.minStock as number;
        const unit = info.row.original.unit;

        // Hitung persentase terhadap stok minimum
        const percentage =
          minStock > 0 ? (stock / minStock) * 100 : stock > 0 ? 100 : 0;
        const isLow = stock < minStock;

        // Tentukan skema warna dinamis
        let colorFrom = '#10b981'; // Emerald
        let colorTo = '#0d9488';

        if (stock <= 0) {
          colorFrom = '#f87171'; // Red
          colorTo = '#ef4444';
        } else if (isLow) {
          colorFrom = '#fbbf24'; // Amber
          colorTo = '#f59e0b';
        }

        return (
          <div className="flex flex-col gap-1 w-full max-w-[140px] py-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
              <span className="font-bold text-[11px] text-gray-800">
                {stock}{' '}
                <span className="text-gray-400 font-medium">{unit}</span>
              </span>
              <span className="text-[9px]">
                Min: {minStock} {unit}
              </span>
            </div>
            <WaterProgressBar
              value={percentage}
              height={8}
              colorFrom={colorFrom}
              colorTo={colorTo}
              decimals={0}
              className="mt-0.5"
            />
          </div>
        );
      }
    },
    {
      header: 'Unit',
      accessorKey: 'unit',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-bold text-[10px] text-gray-600">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Min Stock',
      accessorKey: 'minStock',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-semibold text-[11px] text-gray-700">
            {info.getValue()}{' '}
            <span className="text-[9px] text-gray-400">
              {info.row.original.unit}
            </span>
          </span>
        </div>
      )
    },
    {
      header: 'Preferred Vendor',
      id: 'vendorName',
      accessorFn: (row: any) => row.vendor?.name,
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-semibold text-[11px] text-gray-700">
            {info.getValue() || '-'}
          </span>
        </div>
      )
    }
  ];

  const handleExport = () => {
    const sortedMaterials = [...filteredMaterials].sort((a: any, b: any) =>
      (a.code || '').localeCompare(b.code || '')
    );
    const exportData = sortedMaterials.map((m: any) => ({
      Code: m.code,
      Name: m.name,
      Brand: m.brand || '-',
      Category: m.category,
      'Current Stock': m.currentStock,
      Unit: m.unit,
      'Min Stock': m.minStock,
      'Preferred Vendor': m.vendor?.name || '-'
    }));
    exportToExcel(
      exportData,
      `RTU_Stok_Bahan_Baku_${new Date().toISOString().split('T')[0]}`,
      'Stok Bahan Baku'
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-3.5">
        <ReusableTitle
          title="Laporan Stok Bahan Baku"
          subtitle="Pantau persediaan bahan baku di setiap outlet secara real-time dengan alokasi FIFO."
          borderColorClass="border-l-emerald-500"
          actions={
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredMaterials.length === 0}
              icon={Download}
            >
              Export Excel
            </Button>
          }
          icon={ShoppingBasket}
          iconColorClass="text-emerald-400"
        />

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <CountCard
            compact={true}
            title="Total Material Aktif"
            value={(materials || []).length}
            subValue="SKU"
            description={`Tersedia di ${categories.length} Kategori`}
            icon={Package}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            compact={true}
            title="Stok Rendah / Kritis"
            value={lowStockMaterials.length}
            subValue="Item"
            description={
              lowStockMaterials.length === 0
                ? 'Semua stok dalam ambang aman'
                : `${lowStockMaterials.length} material memerlukan restock`
            }
            icon={AlertTriangle}
            iconClassName={
              lowStockMaterials.length > 0
                ? 'text-amber-600 bg-amber-50'
                : 'text-emerald-600 bg-emerald-50'
            }
          />
          <CountCard
            compact={true}
            title="Estimasi Nilai Inventori"
            value={toIDR(Math.round(stats.totalValuation))}
            description={`Snapshot GRN • Rata-rata ${toIDR((materials || []).length > 0 ? Math.round(stats.totalValuation / materials.length) : 0)}/material`}
            icon={DollarSign}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
        </div>

        {/* Global Filter */}
        <div className="space-y-1">
          <div className="bg-white p-3.5 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3.5 items-end justify-between">
            <div className="flex flex-col md:flex-row gap-3.5 items-end w-full md:w-auto">
              <OutletSelector
                value={selectedOutletId}
                onSelect={setSelectedOutletId}
                className="w-full md:w-72"
                label="Cabang"
                autoSelectFirst={true}
              />
              <div className="w-full md:w-72">
                <ReusableSelect
                  label="Kategori"
                  icon={Tags}
                  value={selectedCategory || 'ALL'}
                  onChange={(v) =>
                    setSelectedCategory(v === 'ALL' ? '' : String(v))
                  }
                  options={[
                    { label: 'Semua Kategori', value: 'ALL' },
                    ...categories.map((c: any) => ({
                      label: c.name,
                      value: c.name
                    }))
                  ]}
                  triggerClassName="h-10 border-gray-200 text-sm"
                  searchable={false}
                  save={true}
                  saveKey="materialStockCategoryFilter"
                />
              </div>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 italic pl-0.5">
            * Menampilkan kuantitas stok yang tersedia di cabang terpilih.
          </div>
        </div>

        {/* Stock Filter Tabs */}
        <ReusableTabs
          value={tabValue}
          onValueChange={(val: any) => setTabValue(val)}
          variant="emerald"
          widthClass="md:w-[600px]"
          tabs={[
            { value: 'all', label: 'Semua Material', icon: Package },
            {
              value: 'above',
              label: 'Stok di Atas Minimum',
              icon: CheckCircle
            },
            {
              value: 'below',
              label: 'Stok di Bawah Minimum',
              icon: AlertTriangle
            }
          ]}
        />

        {/* Low Stock Alerts */}
        {lowStockMaterials.length > 0 && (
          <Alert
            variant="destructive"
            className="border-red-200 bg-red-50/50 rounded-sm"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold text-sm uppercase tracking-wide">
              Peringatan Stok Rendah
            </AlertTitle>
            <AlertDescription className="text-xs font-semibold mt-1">
              Terdapat {lowStockMaterials.length} bahan baku yang memiliki
              kuantitas stok di bawah batas minimum (Min Stock) di outlet ini.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Table */}
        <TableData
          data={filteredMaterials}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isDataLoading && filteredMaterials.length === 0}
          renderActions={(item: any) => (
            <div className="flex justify-start py-0">
              <MaterialLotsDialog material={item} outletId={selectedOutletId} />
            </div>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
