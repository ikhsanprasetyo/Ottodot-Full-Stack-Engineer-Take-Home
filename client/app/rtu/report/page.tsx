'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { useGetRTUReportSummary } from '@/lib/hooks/queries/rtu-report';
import {
  TrendingUp,
  Package,
  Truck,
  ArrowUpRight,
  Flame,
  DollarSign,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/utils/excel-export';
import { toIDR } from '@/lib/utils';
import dayjs from 'dayjs';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { MonthPicker } from '@/components/shared/month-picker';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { useState } from 'react';

export default function RTUReportPage() {
  const [selectedOutletId, setSelectedOutletId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const { data, isLoading } = useGetRTUReportSummary({
    outletId: selectedOutletId || undefined,
    month: selectedMonth
  });

  const stats = [
    {
      label: 'Kalkulasi HPP (Total)',
      value: `Rp ${(data?.stats?.totalProductionCost || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
      description: 'Total biaya produksi terakumulasi'
    },
    {
      label: 'Active Batches',
      value: data?.stats?.totalBatches || 0,
      icon: Flame,
      color: 'bg-orange-50 text-orange-600',
      description: 'Total perencanaan & produksi'
    },
    {
      label: 'Bahan Baku Aktif',
      value: data?.stats?.activeMaterials || 0,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      description: 'Material terdaftar di system'
    },
    {
      label: 'Total Distribusi',
      value: data?.stats?.totalDistribution || 0,
      icon: Truck,
      color: 'bg-purple-50 text-purple-600',
      description: 'Logistik keluar ke outlet'
    }
  ];

  if (isLoading) {
    return (
      <DashboardLayout isLoading={true}>
        <div className="w-full space-y-8 animate-pulse">
          <Skeleton className="h-10 w-64 rounded-sm" />
          <Skeleton className="h-16 w-full rounded-sm" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-sm" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[350px] rounded-sm" />
            <Skeleton className="h-[350px] rounded-sm" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="w-full space-y-8 pb-20">
        <ReusableTitle
          title="CK Performance Report"
          subtitle="Ringkasan data produksi, HPP, dan manajemen logistik Central Kitchen."
          borderColorClass="border-l-indigo-600"
          actions={
            <Button
              variant="outline"
              className="h-10 px-5 rounded-sm font-medium border-gray-200 gap-2 shadow-sm bg-white hover:bg-gray-50 transition-all text-sm"
              icon={Download}
              onClick={() => {
                const summaryData = stats.map((s) => ({
                  Indicator: s.label,
                  Value: s.value,
                  Description: s.description
                }));

                const trendData = (data?.productionTrend || []).map(
                  (t: any) => ({
                    Date: dayjs(t.date).format('YYYY-MM-DD'),
                    'Investment Value (Rp)': t.total
                  })
                );

                exportToExcel(
                  [
                    ...summaryData,
                    {},
                    { Indicator: 'DAILY TREND' },
                    ...trendData
                  ],
                  `RTU_Report_${dayjs().format('YYYY-MM-DD')}`,
                  'Summary'
                );
              }}
            >
              Download Report
            </Button>
          }
          icon={TrendingUp}
          iconColorClass="text-indigo-600"
        />

        {/* Filter Bar — same pattern as purchase page */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-white border border-gray-100 rounded-sm shadow-sm">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            label="Cabang"
            placeholder="Semua Cabang..."
            allowAll={true}
            autoSelectFirst={true}
            save={true}
            saveKey="selectedOutletId"
          />
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            save={true}
            saveKey="selectedMonth"
            useLabelComponent
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <Card
              key={i}
              className="border-none shadow-sm rounded-sm hover:shadow-md transition-all group active:scale-95 duration-300"
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`p-3 rounded-sm ${stat.color} transition-transform group-hover:rotate-6`}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="p-1 px-2 bg-gray-50 rounded-sm text-gray-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-gray-400 tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Trend Chart */}
          <Card className="md:col-span-8 border-none shadow-sm rounded-sm bg-white overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Tren Produksi (7 Hari Terakhir)
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 uppercase tracking-wider">
                Nilai investasi bahan baku per hari
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.productionTrend || []}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
                    tickFormatter={(v) => dayjs(v).format('DD MMM')}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
                    tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      padding: '0.75rem',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="md:col-span-4 border-none shadow-sm rounded-sm bg-gray-900 text-white flex flex-col justify-between overflow-hidden relative">
            <div className="p-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center text-blue-400 mb-5 backdrop-blur-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                Estimasi Nilai Inventori
              </p>
              <h3 className="text-3xl font-bold tracking-tight">
                {toIDR(
                  Math.round(data?.stats?.estimatedInventoryValue || 0),
                  0,
                  0
                )}
              </h3>
              <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                &quot;Data nilai stok dihitung berdasarkan snapshot harga
                terakhir dari barang masuk (GRN).&quot;
              </p>
            </div>

            <div className="bg-white/5 px-6 py-4 backdrop-blur-sm relative z-10 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">
                  Live data tracking active
                </span>
              </div>
            </div>

            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm rounded-sm bg-white overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Top Products Produced
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 uppercase tracking-wider">
                Volume produksi terbanyak (Completed)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] px-4 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topProducts || []}
                  layout="vertical"
                  margin={{ left: 40, right: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#1e293b' }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-sm bg-white overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Efisiensi Yield Produksi
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 uppercase tracking-wider">
                Persentase realisasi vs resep (7 Hari)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] px-4 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.losses || []}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
                    tickFormatter={(v) => dayjs(v).format('DD MMM')}
                  />
                  <YAxis
                    domain={[80, 110]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="yieldRate"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorYield)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
