'use client';

import { useState } from 'react';
import { RefreshCcw, History, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LedgerTable } from './ledger-table';
import { useGetRTUStockLedgers } from '@/lib/hooks/queries/rtu-stock-ledger';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import dayjs from 'dayjs';
import { exportToExcel } from '@/lib/utils/excel-export';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { useMemo } from 'react';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';

import { OutletSelector } from '@/components/shared/outlet-selector';
import { MonthPicker } from '@/components/shared/month-picker';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';

export default function RTUStockLedgerPage() {
  const [selectedOutletId, setSelectedOutletId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [materialId, setMaterialId] = useState<string>('all');
  const [movementType, setMovementType] = useState<string>('all');

  const { data: materials } = useGetRTUMaterials();
  const { data: ledgers, isLoading } = useGetRTUStockLedgers({
    materialId: materialId === 'all' ? undefined : materialId,
    movementType: movementType === 'all' ? undefined : movementType,
    outletId: selectedOutletId === 'all' ? undefined : selectedOutletId,
    month: selectedMonth
  });

  const materialOptions = useMemo(() => {
    const base = [{ label: 'Semua Material', value: 'all' }];
    (materials?.data || []).forEach((m: any) => {
      base.push({
        label: `${m.name}${m.code ? ` [${m.code}]` : ''}`,
        value: m._id
      });
    });
    return base;
  }, [materials?.data]);

  const movementTypeOptions = useMemo(
    () => [
      { label: 'All Movements', value: 'all' },
      { label: 'IN (Penerimaan)', value: 'IN' },
      { label: 'OUT (Produksi)', value: 'OUT' },
      { label: 'ADJUSTMENT', value: 'ADJUSTMENT' }
    ],
    []
  );

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="w-full space-y-6 pb-20">
        <ReusableTitle
          title="Stock Audit Ledger"
          subtitle="Kartu stok digital untuk melacak setiap pergerakan material secara immutable."
          borderColorClass="border-l-slate-800"
          actions={
            <Button
              variant="outline"
              icon={FileSpreadsheet}
              className="h-10 px-5 rounded-sm font-medium border-gray-200 gap-2 shadow-sm bg-white hover:bg-gray-50 text-sm"
              onClick={() => {
                if (!ledgers || ledgers.length === 0) return;
                const exportData = ledgers.map((l) => ({
                  Date: dayjs(l.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                  Cabang: l.outlet?.label || l.outlet?.name || '-',
                  Material: l.material?.name,
                  Code: l.material?.code,
                  Type: l.movementType,
                  Qty:
                    l.movementType === 'IN'
                      ? Math.abs(l.qty)
                      : -Math.abs(l.qty),
                  Unit: l.unit,
                  'Balance After': l.balanceAfter,
                  'Ref Type': l.refType,
                  Reference: l.notes || l.refId,
                  'Petugas / User':
                    l.creator?.name ||
                    l.creator?.username ||
                    l.creator?.email ||
                    'System'
                }));
                exportToExcel(
                  exportData,
                  `Stock_Ledger_${dayjs().format('YYYY-MM-DD')}`,
                  'Ledger'
                );
              }}
            >
              Export Excel
            </Button>
          }
          icon={History}
          iconColorClass="text-slate-800"
        />

        {/* Filters */}
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

          <ReusableSelect
            label="Filter Material"
            options={materialOptions}
            value={materialId}
            onChange={(val) => setMaterialId(val as string)}
            placeholder="Semua Material"
            searchable={true}
            className="w-full sm:w-72"
          />

          <ReusableSelect
            label="Movement Type"
            options={movementTypeOptions}
            value={movementType}
            onChange={(val) => setMovementType(val as string)}
            placeholder="All Movements"
            className="w-full sm:w-52"
          />
        </div>

        {/* Table */}
        <Card className="border-none shadow-sm rounded-sm bg-white overflow-hidden">
          <LedgerTable data={ledgers || []} isLoading={isLoading} />
        </Card>

        {/* Info Footer */}
        <div className="bg-gray-900 rounded-sm p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/20 rounded-sm text-blue-400">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold leading-none mb-1">
                Immutable Audit System
              </p>
              <p className="text-gray-400 text-xs tracking-wider">
                Setiap perubahan stok tercatat selamanya & tidak bisa diedit.
              </p>
            </div>
          </div>
          <Button className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-sm h-10 px-6 text-sm">
            View Analytics
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
