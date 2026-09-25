'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUUnits } from '@/lib/hooks/queries/rtu-unit';
import { UnitTable } from './unit-table';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { AddUnitButton } from './add-unit-dialog';
import { Scale, Tag, Trash2, Layers } from 'lucide-react';
import { CountCard } from '@/components/ui/count-card';
import { Card } from '@/components/ui/card';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const LEVEL_COLORS = ['#64748b', '#3b82f6', '#f59e0b', '#8b5cf6'];
const LEVEL_NAMES = [
  'Lvl 0 (Dasar)',
  'Lvl 1 (Individual)',
  'Lvl 2 (Bundel)',
  'Lvl 3 (Besar)'
];

export default function UnitPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, isLoading: isDataLoading } = useGetRTUUnits(
    globalFilter,
    undefined,
    showDeleted
  );

  const units = useMemo(() => data?.data || [], [data?.data]);
  const showLoading = isDataLoading && units.length === 0;

  const stats = useMemo(() => {
    let baseUnitsCount = 0;
    let highUnitsCount = 0;
    const baseUnitNames: string[] = [];
    const highUnitNames: string[] = [];
    const levelMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    units.forEach((u: any) => {
      const lvl = Number(u.level ?? 0);
      const name = u.name || '';
      if (lvl === 0) {
        baseUnitsCount += 1;
        if (name) baseUnitNames.push(name);
      } else {
        highUnitsCount += 1;
        if (name) highUnitNames.push(name);
      }
      levelMap[lvl] = (levelMap[lvl] || 0) + 1;
    });

    const levelBreakdown = [0, 1, 2, 3]
      .map((lvl) => ({
        name: LEVEL_NAMES[lvl],
        count: levelMap[lvl] || 0,
        level: lvl
      }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count);

    const baseNamesStr =
      baseUnitNames.length > 0
        ? baseUnitNames.join(', ')
        : 'Belum ada satuan dasar';

    const highNamesStr =
      highUnitNames.length > 0
        ? highUnitNames.join(', ')
        : 'Belum ada satuan kemasan';

    return {
      totalCount: units.length,
      baseUnitsCount,
      highUnitsCount,
      levelBreakdown,
      baseNamesStr,
      highNamesStr
    };
  }, [units]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Satuan Pengukuran (UoM)"
          subtitle="Kelola unit satuan pengukuran (Unit of Measure) beserta tingkat level hierarkinya."
          borderColorClass="border-l-indigo-500"
          actions={!showDeleted && <AddUnitButton />}
          icon={Scale}
          iconColorClass="text-indigo-400"
        />

        <ReusableTabs
          value={showDeleted ? 'deleted' : 'active'}
          onValueChange={(val) => setShowDeleted(val === 'deleted')}
          variant="blue"
          tabs={[
            { value: 'active', label: 'Satuan Active', icon: Tag },
            { value: 'deleted', label: 'Recycle Bin', icon: Trash2 }
          ]}
        />

        {/* Metrics Grid */}
        {!showDeleted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CountCard
              compact={true}
              title="Total Satuan (UoM)"
              value={stats.totalCount}
              subValue="Satuan"
              description="Master Unit Pengukuran & Konversi"
              icon={Scale}
              iconClassName="text-indigo-600 bg-indigo-50"
            />
            <CountCard
              compact={true}
              title="Satuan Dasar (Level 0)"
              value={stats.baseUnitsCount}
              subValue="Base Unit"
              description={stats.baseNamesStr}
              icon={Tag}
              iconClassName="text-slate-600 bg-slate-100"
            />
            <CountCard
              compact={true}
              title="Satuan Kemasan (Lvl 1+)"
              value={stats.highUnitsCount}
              subValue="High-Level"
              description={stats.highNamesStr}
              icon={Layers}
              iconClassName="text-blue-600 bg-blue-50"
            />

            {/* Donut Recharts Card */}
            <Card className="shadow-sm border border-gray-100 rounded-sm bg-white p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Sebaran Level UoM
                </p>
                <span className="text-[10px] font-semibold text-slate-600">
                  {stats.levelBreakdown.length} Level
                </span>
              </div>
              {stats.levelBreakdown.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="h-[72px] w-[72px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={stats.levelBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={34}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {stats.levelBreakdown.map((item) => (
                            <Cell
                              key={`cell-${item.level}`}
                              fill={
                                LEVEL_COLORS[item.level % LEVEL_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any) => [`${val} Satuan`, 'Jumlah']}
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
                    {stats.levelBreakdown.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-slate-600 py-0.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 mr-2">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{
                              backgroundColor:
                                LEVEL_COLORS[item.level % LEVEL_COLORS.length]
                            }}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {item.count}
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

        <UnitTable
          dataArray={units}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={showLoading}
          isDeletedMode={showDeleted}
        />
      </div>
    </DashboardLayout>
  );
}
