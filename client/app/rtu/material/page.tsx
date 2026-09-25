'use client';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { RTUMaterialTable } from './material-table';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Tags,
  Package,
  Trash2,
  ShoppingBasket,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel-export';
import { AddMaterialButton } from './add-material-button';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { CountCard } from '@/components/ui/count-card';
import { Card } from '@/components/ui/card';
import { toIDR } from '@/lib/utils';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const CATEGORY_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b'
];

export default function MaterialsPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const { data, isLoading: isDataLoading } = useGetRTUMaterials(
    globalFilter,
    undefined,
    undefined,
    selectedOutletId,
    selectedCategory,
    showDeleted
  );

  const { data: categoriesData } = useGetRTUCategories('', true);
  const categories = useMemo(
    () => categoriesData?.data || [],
    [categoriesData?.data]
  );
  const materials = useMemo(() => data?.data || [], [data?.data]);
  // Spinner hanya saat PERTAMA kali load (tidak ada data sama sekali)
  const showLoading = isDataLoading && materials.length === 0;

  const stats = useMemo(() => {
    const totalItems = materials.length;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValuation = 0;
    const catMap: Record<string, number> = {};

    materials.forEach((m: any) => {
      const stock = Number(m.currentStock || 0);
      const min = Number(m.minStock || 0);
      const price = Number(m.currentPrice || 0);

      if (stock <= 0) {
        outOfStock += 1;
        lowStock += 1;
      } else if (stock <= min) {
        lowStock += 1;
      }

      totalValuation += stock * price;

      const catName = m.category || 'Tanpa Kategori';
      catMap[catName] = (catMap[catName] || 0) + 1;
    });

    const categoryBreakdown = Object.entries(catMap)
      .map(([name, count]) => ({
        name,
        count
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalValuation,
      categoryBreakdown
    };
  }, [materials]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-3.5">
        <ReusableTitle
          title="Material Inventory (Bahan Baku)"
          subtitle="Monitor stok bahan baku secara real-time dan kelola ambang batas minimum."
          borderColorClass="border-l-emerald-500"
          actions={
            !showDeleted && (
              <>
                <Button
                  icon={Download}
                  variant="outline"
                  onClick={() => {
                    const exportData = materials.map((m: any) => ({
                      Code: m.code,
                      Name: m.name,
                      Brand: m.brand || '-',
                      Category: m.category,
                      'Current Stock': m.currentStock,
                      Unit: m.unit,
                      'Min Stock': m.minStock,
                      Vendor: m.vendor?.name || '-',
                      'Current Price': m.currentPrice
                    }));
                    exportToExcel(
                      exportData,
                      `RTU_Inventory_${new Date().toISOString().split('T')[0]}`,
                      'Inventory'
                    );
                  }}
                >
                  Export Excel
                </Button>
                <AddMaterialButton />
              </>
            )
          }
          icon={ShoppingBasket}
          iconColorClass="text-emerald-400"
        />

        {/* Tabs to switch between Active and Deleted materials */}
        <ReusableTabs
          value={showDeleted ? 'deleted' : 'active'}
          onValueChange={(val) => setShowDeleted(val === 'deleted')}
          variant="emerald"
          tabs={[
            { value: 'active', label: 'Bahan Baku', icon: Package },
            { value: 'deleted', label: 'Recycle Bin', icon: Trash2 }
          ]}
        />

        {/* Metrics Grid */}
        {!showDeleted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <CountCard
              compact={true}
              title="Total Bahan Baku"
              value={stats.totalItems}
              subValue="SKU"
              description={`Terdaftar di ${categories.length} Kategori`}
              icon={Package}
              iconClassName="text-emerald-600 bg-emerald-50"
            />
            <CountCard
              compact={true}
              title="Stok Kritis / Restock"
              value={stats.lowStock}
              subValue="Item"
              description={
                stats.lowStock === 0
                  ? 'Semua stok dalam kondisi aman'
                  : `${stats.outOfStock} Stok Kosong • ${stats.lowStock - stats.outOfStock} Menipis`
              }
              icon={AlertTriangle}
              iconClassName={
                stats.lowStock > 0
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-emerald-600 bg-emerald-50'
              }
            />
            <CountCard
              compact={true}
              title="Estimasi Nilai Inventori"
              value={toIDR(Math.round(stats.totalValuation))}
              description={`Snapshot GRN • Rata-rata ${toIDR(stats.totalItems > 0 ? Math.round(stats.totalValuation / stats.totalItems) : 0)}/material`}
              icon={DollarSign}
              iconClassName="text-emerald-600 bg-emerald-50"
            />

            {/* Donut Recharts Card */}
            <Card className="shadow-sm border border-gray-100 rounded-sm bg-white p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Sebaran Kategori
                </p>
                <span className="text-[10px] font-semibold text-slate-600">
                  {stats.categoryBreakdown.length} Kategori
                </span>
              </div>
              {stats.categoryBreakdown.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="h-[72px] w-[72px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={stats.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={34}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {stats.categoryBreakdown.map((_, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={
                                CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any) => [`${val} Item`, 'Jumlah']}
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: '1px solid #f1f5f9',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 max-h-[76px] overflow-y-auto pr-1 flex-1 text-[11px] leading-tight">
                    {stats.categoryBreakdown.map((cat, idx) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-slate-600 py-0.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 mr-2">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                            }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {cat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[72px] flex items-center justify-center text-xs text-gray-400">
                  Belum ada data
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
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
                saveKey="categoryFilter"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <RTUMaterialTable
          dataArray={materials}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={showLoading}
          selectedOutletId={selectedOutletId}
          isDeletedMode={showDeleted}
        />
      </div>
    </DashboardLayout>
  );
}
