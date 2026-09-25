'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { RTUVendorTable } from './vendor-table';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { Button } from '@/components/ui/button';
import { AddVendorButton } from './add-vendor-button';
import {
  Tags,
  MapPin,
  Trash2,
  Store,
  Building2,
  Boxes,
  Clock,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { CountCard } from '@/components/ui/count-card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const CATEGORY_COLORS = [
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#64748B' // Slate
];
export default function VendorsPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // 1. Fetch vendors with server-side category filter
  const { data, isLoading: isDataLoading } = useGetRTUVendors(
    globalFilter,
    undefined,
    selectedCategory,
    showDeleted
  );

  const rawVendors = useMemo(() => data?.data || [], [data?.data]);
  // Gunakan isDataLoading (bukan isFetching) agar spinner hanya muncul saat PERTAMA load
  const showLoading = isDataLoading && rawVendors.length === 0;

  // 2. Fetch categories for category filter
  const { data: categoriesData } = useGetRTUCategories('', true);
  const categories = categoriesData?.data || [];

  // 3. Extract unique provinces and cities client-side from the server-fetched vendors
  // Extract unique provinces
  const provinceOptions = useMemo((): { label: string; value: string }[] => {
    const provinces = Array.from(
      new Set<string>(
        rawVendors
          .map((v: any) => v.branches?.[0]?.province || v.province)
          .filter((p): p is string => !!p)
      )
    );
    return provinces.map((p) => ({ label: p, value: p }));
  }, [rawVendors]);

  // Extract unique cities (filtered by province if selected)
  const cityOptions = useMemo((): { label: string; value: string }[] => {
    const filteredList = selectedProvince
      ? rawVendors.filter(
          (v: any) =>
            (v.branches?.[0]?.province || v.province) === selectedProvince
        )
      : rawVendors;
    const cities = Array.from(
      new Set<string>(
        filteredList
          .map((v: any) => v.branches?.[0]?.city || v.city)
          .filter((c): c is string => !!c)
      )
    );
    return cities.map((c) => ({ label: c, value: c }));
  }, [rawVendors, selectedProvince]);

  // Apply client-side province and city filtering
  const filteredVendors = useMemo(() => {
    let list = rawVendors;
    if (selectedProvince) {
      list = list.filter(
        (v: any) =>
          (v.branches?.[0]?.province || v.province) === selectedProvince
      );
    }
    if (selectedCity) {
      list = list.filter(
        (v: any) => (v.branches?.[0]?.city || v.city) === selectedCity
      );
    }
    return list;
  }, [rawVendors, selectedProvince, selectedCity]);

  const handleProvinceChange = (val: string) => {
    setSelectedProvince(val);
    setSelectedCity('');
  };

  const vendorStats = useMemo(() => {
    const totalVendors = rawVendors.length;
    const activeVendors = rawVendors.filter(
      (v: any) => v.isActive !== false && !v.deletedAt
    ).length;

    const categoryCounts: Record<string, number> = {};
    rawVendors.forEach((v: any) => {
      const cat = v.category || 'Tanpa Kategori';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const uniqueCategories = Object.keys(categoryCounts).filter(
      (c) => c !== 'Tanpa Kategori' || categoryCounts['Tanpa Kategori'] > 0
    ).length;
    let topCategory = '-';
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > maxCatCount && cat !== 'Tanpa Kategori') {
        maxCatCount = count;
        topCategory = cat;
      }
    });

    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          rawVendors.length > 0
            ? Math.round((count / rawVendors.length) * 100)
            : 0
      }))
      .sort((a, b) => b.count - a.count);

    const cities = new Set<string>();
    rawVendors.forEach((v: any) => {
      const city = v.branches?.[0]?.city || v.city;
      if (city) cities.add(city);
    });
    const uniqueCities = cities.size;

    let totalPaymentTerms = 0;
    let validTermCount = 0;
    rawVendors.forEach((v: any) => {
      const term = v.paymentTermDays ?? v.paymentTerm;
      if (typeof term === 'number' && !isNaN(term)) {
        totalPaymentTerms += term;
        validTermCount++;
      }
    });
    const avgPaymentTerm =
      validTermCount > 0 ? Math.round(totalPaymentTerms / validTermCount) : 0;

    return {
      totalVendors,
      activeVendors,
      uniqueCategories,
      topCategory,
      categoryBreakdown,
      uniqueCities,
      avgPaymentTerm
    };
  }, [rawVendors]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Vendor Management (Supplier)"
          subtitle="Kelola database supplier dan integrasi rantai pasokan bahan baku."
          borderColorClass="border-l-indigo-500"
          actions={!showDeleted && <AddVendorButton />}
          icon={Store}
          iconColorClass="text-indigo-400"
        />

        {/* Executive Summary Count Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CountCard
            title="Vendor Aktif"
            value={vendorStats.activeVendors}
            subValue={`/ ${vendorStats.totalVendors} Vendor`}
            description="Total supplier aktif terdaftar"
            icon={Building2}
            iconClassName="text-emerald-600 bg-emerald-50"
          />

          {/* Kategori Supplier Card with Recharts Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="cursor-pointer group">
                <CountCard
                  title="Kategori Supplier"
                  value={vendorStats.uniqueCategories}
                  description={
                    vendorStats.topCategory !== '-'
                      ? `Terbanyak: ${vendorStats.topCategory}`
                      : 'Belum ada kategori'
                  }
                  icon={Boxes}
                  iconClassName="text-purple-600 bg-purple-50 group-hover:bg-purple-100 transition-colors"
                  action={
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-sm group-hover:bg-purple-100 transition-colors">
                      <BarChart2 className="w-2.5 h-2.5" />
                      Detail Chart
                    </span>
                  }
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              className="w-80 p-4 rounded-sm shadow-xl border border-purple-100 bg-white"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-sm bg-purple-50 text-purple-600">
                      <PieChartIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Distribusi Vendor per Kategori
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        Total {vendorStats.totalVendors} Vendor Terdaftar
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recharts Donut Visual */}
                {vendorStats.categoryBreakdown.length > 0 ? (
                  <>
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={vendorStats.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={52}
                            paddingAngle={3}
                            dataKey="count"
                          >
                            {vendorStats.categoryBreakdown.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  CATEGORY_COLORS[
                                    index % CATEGORY_COLORS.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(val: any) => [
                              `${val} Vendor`,
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

                    {/* Breakdown List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {vendorStats.categoryBreakdown.map((cat, idx) => {
                        const color =
                          CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate text-slate-700 font-medium">
                                  {cat.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-900 font-bold text-[11px]">
                                  {cat.count} Vendor
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  ({cat.percentage}%)
                                </span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden">
                              <div
                                className="h-full rounded-sm transition-all duration-500"
                                style={{
                                  width: `${cat.percentage}%`,
                                  backgroundColor: color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Belum ada data kategori vendor
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <CountCard
            title="Jangkauan Wilayah"
            value={vendorStats.uniqueCities}
            description="Total kota/wilayah operasional"
            icon={MapPin}
            iconClassName="text-amber-600 bg-amber-50"
          />
          <CountCard
            title="Rata-Rata TOP"
            value={`${vendorStats.avgPaymentTerm} Hari`}
            description="Term of Payment (Syarat Pembayaran)"
            icon={Clock}
            iconClassName="text-blue-600 bg-blue-50"
          />
        </div>

        {/* Tabs to switch between Active and Deleted vendors */}
        <ReusableTabs
          value={showDeleted ? 'deleted' : 'active'}
          onValueChange={(val) => setShowDeleted(val === 'deleted')}
          variant="blue"
          tabs={[
            { value: 'active', label: 'Vendor Active', icon: MapPin },
            { value: 'deleted', label: 'Recycle Bin', icon: Trash2 }
          ]}
        />

        {/* Filters Card */}
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-56">
            <ReusableSelect
              label="Provinsi"
              icon={MapPin}
              searchable={true}
              showDefaultSelect={true}
              placeholder="Provinsi"
              options={provinceOptions}
              value={selectedProvince}
              onChange={handleProvinceChange}
              triggerClassName="h-10 border-gray-200 text-sm font-medium"
            />
          </div>
          <div className="w-full md:w-56">
            <ReusableSelect
              label="Kota"
              icon={MapPin}
              searchable={true}
              showDefaultSelect={true}
              placeholder="Semua Kota"
              options={cityOptions}
              value={selectedCity}
              onChange={(val) => setSelectedCity(val)}
              disabled={!selectedProvince}
              triggerClassName="h-10 border-gray-200 text-sm font-medium"
            />
          </div>
          <div className="w-full md:w-56">
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
              saveKey="vendorCategoryFilter"
            />
          </div>
          {(selectedProvince || selectedCity || selectedCategory) && (
            <Button
              variant="reset"
              size="xs"
              onClick={() => {
                setSelectedProvince('');
                setSelectedCity('');
                setSelectedCategory('');
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        <RTUVendorTable
          dataArray={filteredVendors}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={showLoading}
          isDeletedMode={showDeleted}
        />
      </div>
    </DashboardLayout>
  );
}
