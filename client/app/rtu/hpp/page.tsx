'use client';

import { useState } from 'react';
import { Calculator, Plus } from 'lucide-react';

import { OutletSelector } from '@/components/shared/outlet-selector';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { HppTable } from './hpp-table';
import { HppDialog } from './hpp-dialog';
import { HppMatrixTable } from './hpp-matrix-table';
import { YearPicker } from '@/components/shared/year-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, Building } from 'lucide-react';

export default function RTUInputHPPPage() {
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedOutlet, setSelectedOutlet] = useState(
    typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : ''
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMonthYear, setEditingMonthYear] = useState<
    string | undefined
  >();

  const handleAddHpp = () => {
    if (!selectedOutlet) return;
    setEditingMonthYear(undefined);
    setIsDialogOpen(true);
  };

  const handleEditHpp = (monthYear: string) => {
    setEditingMonthYear(monthYear);
    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-sm shadow-sm border border-gray-100 border-l-4 border-l-orange-500 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-orange-600" />
              HPP Bulanan
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Kelola total biaya operasional bulanan cabang untuk menghitung
              rasio HPP Produksi.
            </p>
          </div>

          <Button
            onClick={handleAddHpp}
            disabled={!selectedOutlet}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-sm h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah HPP
          </Button>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end flex-wrap">
          <div className="w-full sm:w-48">
            <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 gap-1.5">
              Tahun
            </div>
            <div className="bg-white border border-gray-200 rounded-sm">
              <YearPicker
                value={selectedYear}
                onChange={setSelectedYear}
                placeholder="Pilih Tahun..."
                allowClear={false}
              />
            </div>
          </div>

          {viewMode === 'table' && (
            <div className="w-full sm:w-72">
              <OutletSelector
                value={selectedOutlet}
                onSelect={setSelectedOutlet}
                label="Cabang"
                placeholder="Pilih Cabang..."
                autoSelectFirst={false}
                filterType="central kitchen"
              />
            </div>
          )}
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(val) => setViewMode(val as 'matrix' | 'table')}
          className="w-full space-y-4"
        >
          <div className="w-full sm:w-[450px]">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 h-10">
              <TabsTrigger
                value="matrix"
                className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 flex items-center justify-center whitespace-nowrap"
              >
                <Building2 className="w-4 h-4 mr-2" /> Semua Cabang
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 flex items-center justify-center whitespace-nowrap"
              >
                <Building className="w-4 h-4 mr-2" /> Satu Cabang
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="matrix" className="mt-0">
            <HppMatrixTable year={selectedYear} />
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            {selectedOutlet ? (
              <HppTable
                outletId={selectedOutlet}
                year={selectedYear}
                onEdit={handleEditHpp}
              />
            ) : (
              <div className="text-center p-12 bg-white rounded-sm border border-gray-100 text-gray-500 font-medium">
                Pilih cabang untuk melihat data HPP bulanan
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedOutlet && (
          <HppDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            outletId={selectedOutlet}
            initialMonthYear={editingMonthYear}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
