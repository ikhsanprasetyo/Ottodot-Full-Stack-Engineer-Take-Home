'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { CategoryTable } from './category-table';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { AddCategoryButton } from './add-category-dialog';
import { Folder, Layers, Trash2, CheckCircle2 } from 'lucide-react';
import { CountCard } from '@/components/ui/count-card';
import { Card } from '@/components/ui/card';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const STATUS_COLORS = ['#10b981', '#94a3b8'];

export default function CategoryPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading: isDataLoading } = useGetRTUCategories(
    globalFilter,
    undefined,
    showDeleted
  );

  const categories = useMemo(() => data?.data || [], [data?.data]);
  const showLoading = isDataLoading && categories.length === 0;

  const stats = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;

    categories.forEach((c: any) => {
      if (c.isActive !== false) {
        activeCount += 1;
      } else {
        inactiveCount += 1;
      }
    });

    const statusBreakdown = [
      { name: 'Aktif', count: activeCount },
      { name: 'Non-Aktif', count: inactiveCount }
    ].filter((s) => s.count > 0);

    return {
      totalCount: categories.length,
      activeCount,
      inactiveCount,
      statusBreakdown
    };
  }, [categories]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Kategori Bahan & Produk"
          subtitle="Kelola kategori master untuk klasifikasi bahan baku dan produk."
          borderColorClass="border-l-emerald-500"
          actions={!showDeleted && <AddCategoryButton />}
          icon={Layers}
          iconColorClass="text-emerald-400"
        />

        <ReusableTabs
          value={showDeleted ? 'deleted' : 'active'}
          onValueChange={(val) => setShowDeleted(val === 'deleted')}
          variant="emerald"
          tabs={[
            { value: 'active', label: 'Kategori Active', icon: Folder },
            { value: 'deleted', label: 'Recycle Bin', icon: Trash2 }
          ]}
        />

        {/* Metrics Grid */}
        {!showDeleted && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CountCard
              compact={true}
              title="Total Kategori Active"
              value={stats.activeCount}
              subValue="Kategori"
              description="Master Klasifikasi Bahan Baku & Produk"
              icon={Folder}
              iconClassName="text-emerald-600 bg-emerald-50"
            />
            <CountCard
              compact={true}
              title="Keaktifan Status"
              value={stats.totalCount}
              subValue="Total"
              description={`${stats.activeCount} Aktif • ${stats.inactiveCount} Non-Aktif`}
              icon={CheckCircle2}
              iconClassName="text-blue-600 bg-blue-50"
            />

            {/* Donut Recharts Card */}
            <Card className="shadow-sm border border-gray-100 rounded-sm bg-white p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status Kategori
                </p>
                <span className="text-[10px] font-semibold text-slate-600">
                  {stats.statusBreakdown.length} Status
                </span>
              </div>
              {stats.statusBreakdown.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="h-[72px] w-[72px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={stats.statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={34}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {stats.statusBreakdown.map((_, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={STATUS_COLORS[idx % STATUS_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any) => [
                            `${val} Kategori`,
                            'Jumlah'
                          ]}
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
                    {stats.statusBreakdown.map((s, idx) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between text-slate-600 py-0.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 mr-2">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{
                              backgroundColor:
                                STATUS_COLORS[idx % STATUS_COLORS.length]
                            }}
                          />
                          <span className="truncate">{s.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {s.count}
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

        <CategoryTable
          dataArray={categories}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={showLoading}
          isDeletedMode={showDeleted}
        />
      </div>
    </DashboardLayout>
  );
}
