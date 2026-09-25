'use client';

import { useState, useMemo } from 'react';
import {
  Truck,
  Filter,
  PackageCheck,
  List,
  Table as TableIcon
} from 'lucide-react';

import { DistributionTable } from './distribution-table';
import { DistributionMatrixTable } from './distribution-matrix-table';
import { Card, CardContent } from '@/components/ui/card';
import { AddDistributionDialog } from './add-distribution-dialog';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUDistributions } from '@/lib/hooks/queries/rtu-distribution';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { MonthPicker } from '@/components/shared/month-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReusableTitle } from '@/components/ui/reusable-title';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';
import dayjs from 'dayjs';

export default function RTUDistributionPage() {
  const [search, setSearch] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedDestinationOutletId, setSelectedDestinationOutletId] =
    useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined'
      ? getLocalStorageSettings('rtu-distribution', 'activeTab', isString) ||
        'table'
      : 'table'
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateLocalStorageSettings('rtu-distribution', 'activeTab', val);
  };

  const { hasPermission: canCreate } = useGetPermission(
    'create',
    'distribution'
  );

  const { data: distributions, isLoading } =
    useGetRTUDistributions(selectedOutletId);

  // Fetch semua outlet tanpa memandang akses (ignoreAccess = true)
  const { data: allOutletsForDestination } = useGetOutlets(
    0,
    100,
    '',
    false,
    '',
    false,
    true
  );

  const destinationOptions = useMemo(() => {
    return (
      allOutletsForDestination?.data?.map((outlet: any) => ({
        value: outlet._id,
        label: `${outlet.label} (${outlet.region})`
      })) || []
    );
  }, [allOutletsForDestination]);

  const filteredDistributions = useMemo(() => {
    const list = distributions || [];
    return list.filter((item) => {
      const dateStr = item.shipmentDate || item.createdAt;
      if (!dateStr) return false;
      const itemMonth = dayjs(dateStr).format('YYYY-MM');
      if (itemMonth !== selectedMonth) return false;

      if (
        selectedDestinationOutletId &&
        item.outlet?._id !== selectedDestinationOutletId
      ) {
        return false;
      }

      return true;
    });
  }, [distributions, selectedMonth, selectedDestinationOutletId]);

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="w-full space-y-6">
        <ReusableTitle
          title="Shipment (Pengiriman & Distribusi)"
          subtitle="Manajemen logistik pengiriman barang dan material antar outlet."
          borderColorClass="border-l-blue-600"
          actions={
            canCreate && (
              <AddDistributionDialog destinationOptions={destinationOptions} />
            )
          }
          icon={Truck}
          iconColorClass="text-blue-600"
        />

        {/* Filters */}
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-72"
            label="Cabang Pengirim"
            autoSelectFirst={true}
            save={true}
            saveKey="outletId"
          />

          <div className="w-full md:w-72">
            <Label className="flex items-center text-xs font-bold text-gray-700 mb-1 ml-1">
              <MapPin className="w-3 h-3 mr-1" /> Cabang Tujuan
            </Label>
            <Combobox
              options={[
                { value: '', label: 'Semua Cabang Tujuan...' },
                ...destinationOptions
              ]}
              value={selectedDestinationOutletId}
              onSelect={setSelectedDestinationOutletId}
              placeholder="Semua Cabang Tujuan..."
              emptyMessage="Tidak ada outlet."
            />
          </div>

          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            save={true}
            saveKey="selectedMonth"
          />
        </div>

        {/* Stats Mini Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Total Pengiriman',
              val: filteredDistributions.length || 0,
              icon: PackageCheck,
              color: 'text-blue-600',
              bg: 'bg-blue-50'
            },
            {
              label: 'Dalam Transit',
              val:
                filteredDistributions.filter((d) => d.status === 'SHIPPED')
                  .length || 0,
              icon: Truck,
              color: 'text-orange-600',
              bg: 'bg-orange-50'
            },
            {
              label: 'Selesai Terkirim',
              val:
                filteredDistributions.filter((d) => d.status === 'RECEIVED')
                  .length || 0,
              icon: Filter,
              color: 'text-green-600',
              bg: 'bg-green-50'
            }
          ].map((stat, i) => (
            <Card
              key={i}
              className="border-none shadow-sm rounded-sm group hover:shadow-md transition-all duration-300"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div
                  className={`p-4 rounded-sm ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-white border border-gray-200">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <List className="w-4 h-4 mr-2" /> List View
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <TableIcon className="w-4 h-4 mr-2" /> Table
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <DistributionTable
              distributions={filteredDistributions}
              isLoading={isLoading}
              globalFilter={search}
              setGlobalFilter={setSearch}
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="table" className="space-y-6 mt-6">
            <DistributionMatrixTable
              distributions={filteredDistributions}
              isLoading={isLoading}
              globalFilter={search}
              setGlobalFilter={setSearch}
              selectedMonth={selectedMonth}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
