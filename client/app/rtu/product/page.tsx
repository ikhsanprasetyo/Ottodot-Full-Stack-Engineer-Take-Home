'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { RTUProductTable } from './product-table';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { ReusableSelect } from '@/components/ui/reusable-select';
import {
  Tags,
  Trash2,
  Package,
  Factory,
  BookOpenCheck,
  Layers
} from 'lucide-react';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { AddProductButton } from './add-product-dialog';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { CountCard } from '@/components/ui/count-card';
import { Card } from '@/components/ui/card';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const CATEGORY_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899'
];

export default function ProductsPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const { data, isLoading: isDataLoading } = useGetRTUProducts(
    globalFilter,
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
  const products = useMemo(() => data?.data || [], [data?.data]);
  // Gunakan isDataLoading (bukan isFetching) agar spinner hanya muncul saat PERTAMA load
  const showLoading = isDataLoading && products.length === 0;

  const stats = useMemo(() => {
    const totalItems = products.length;
    let hasRecipeCount = 0;
    let hasUnitsCount = 0;
    const catMap: Record<string, number> = {};

    products.forEach((p: any) => {
      if (p.recipe || p.recipeId) {
        hasRecipeCount += 1;
      }
      if (p.units && Array.isArray(p.units) && p.units.length > 0) {
        hasUnitsCount += 1;
      }

      const catName = p.category || 'Tanpa Kategori';
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
      hasRecipeCount,
      hasUnitsCount,
      categoryBreakdown
    };
  }, [products]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Product Master (Formulasi)"
          subtitle="Kelola spesifikasi produk jadi, standardisasi resep, dan manajemen versi produksi."
          borderColorClass="border-l-indigo-500"
          actions={!showDeleted && <AddProductButton />}
          icon={Factory}
          iconColorClass="text-indigo-400"
        />

        {/* Tabs to switch between Active and Deleted products */}
        <ReusableTabs
          value={showDeleted ? 'deleted' : 'active'}
          onValueChange={(val) => setShowDeleted(val === 'deleted')}
          variant="blue"
          tabs={[
            { value: 'active', label: 'Produk Active', icon: Package },
            { value: 'deleted', label: 'Recycle Bin', icon: Trash2 }
          ]}
        />

        {/* Metrics Grid */}
        {!showDeleted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CountCard
              compact={true}
              title="Total Produk Jadi"
              value={stats.totalItems}
              subValue="SKU"
              description={`Terdaftar di ${categories.length} Kategori Produk`}
              icon={Package}
              iconClassName="text-indigo-600 bg-indigo-50"
            />
            <CountCard
              compact={true}
              title="Formula & Resep"
              value={stats.hasRecipeCount}
              subValue="Formula"
              description={`${stats.hasRecipeCount} Siap Produksi • ${stats.totalItems - stats.hasRecipeCount} Belum Ada Resep`}
              icon={BookOpenCheck}
              iconClassName="text-emerald-600 bg-emerald-50"
            />
            <CountCard
              compact={true}
              title="Konversi Satuan (UOM)"
              value={stats.hasUnitsCount}
              subValue="Produk"
              description={`${stats.hasUnitsCount} Produk Memiliki Multi-Satuan`}
              icon={Layers}
              iconClassName="text-blue-600 bg-blue-50"
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
                          formatter={(val: any) => [`${val} Produk`, 'Jumlah']}
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
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
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
              saveKey="productCategoryFilter"
            />
          </div>
        </div>

        <RTUProductTable
          dataArray={products}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={showLoading}
          isDeletedMode={showDeleted}
        />
      </div>
    </DashboardLayout>
  );
}
