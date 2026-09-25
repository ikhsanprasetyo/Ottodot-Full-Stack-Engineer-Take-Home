'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { SortingState } from '@tanstack/react-table';
import {
  Receipt,
  Download,
  Plus,
  CheckCircle,
  Clock,
  Link,
  Activity
} from 'lucide-react';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { TableData } from '@/components/ui/table-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import { exportToExcel } from '@/lib/utils/excel-export';
import { List, Table as TableIcon } from 'lucide-react';
import { ReusableTabs } from '@/components/ui/reusable-tabs';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { MonthPicker } from '@/components/shared/month-picker';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { CountCard } from '@/components/ui/count-card';
import { setDateStr } from '@/lib/date';
import { toIDR } from '@/lib/utils';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { RTUInvoiceReconcile } from '@/lib/type/rtu_invoice_reconcile';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { InvoiceDetailsDialog } from './invoice-details-dialog';
import { GRNDetailsDialog } from '../grn/grn-details-dialog';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShowMoreList } from '@/components/shared/show-more-list';
import { InvoiceMatrixTable } from './invoice-matrix-table';

const GrnCell = ({ grns }: { grns: any[] }) => {
  return (
    <ShowMoreList
      items={grns}
      renderItem={(g) => (
        <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-sm pl-1.5 pr-0.5 py-0 hover:bg-gray-50/90 hover:border-gray-300 transition-all shadow-sm whitespace-nowrap flex-nowrap">
          <span className="text-[9px] text-gray-700 font-mono font-bold whitespace-nowrap">
            {g.grnNumber}
          </span>
          <GRNDetailsDialog grn={g} />
        </div>
      )}
    />
  );
};

function InvoicePageContent() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const { hasPermission: canUpdate } = useGetPermission('update');
  const searchParams = useSearchParams();
  const router = useRouter();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'invoiceDate', desc: true }
  ]);
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined'
      ? getLocalStorageSettings(
          'rtu-invoice-reconcile',
          'activeTab',
          isString
        ) || 'list'
      : 'list'
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() =>
    typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : ''
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSellerValue, setSelectedSellerValue] = useState('');

  const { sellerVendorId, sellerOutletId } = useMemo(() => {
    if (
      !selectedSellerValue ||
      selectedSellerValue === 'all' ||
      selectedSellerValue === 'ALL'
    )
      return { sellerVendorId: undefined, sellerOutletId: undefined };
    const [type, id] = selectedSellerValue.split(':');
    return {
      sellerVendorId: type === 'vendor' ? id : undefined,
      sellerOutletId: type === 'seller' ? id : undefined
    };
  }, [selectedSellerValue]);

  // Auto-open create dialog from redirect (e.g., from purchase details)
  const action = searchParams.get('action');
  const initialPoId = searchParams.get('poId') || '';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (action === 'create' && initialPoId) {
      setCreateDialogOpen(true);
    }
  }, [action, initialPoId]);

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val);
    updateLocalStorageSettings('rtu-invoice-reconcile', 'activeTab', val);
  }, []);

  const { data, isLoading: isDataLoading } = useGetRTUInvoiceReconciles();
  const invoices: RTUInvoiceReconcile[] = useMemo(
    () => (data?.data || []) as RTUInvoiceReconcile[],
    [data]
  );

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      const dateStr = item.invoiceDate || item.createdAt;
      if (!dateStr) return false;
      if (dayjs(dateStr).format('YYYY-MM') !== selectedMonth) return false;
      if (selectedOutletId && item.outlet?._id !== selectedOutletId)
        return false;

      // Seller / Vendor Filter
      if (
        sellerVendorId &&
        item.vendorId !== sellerVendorId &&
        item.vendor?._id !== sellerVendorId
      ) {
        return false;
      }
      if (
        sellerOutletId &&
        item.purchase?.sellerId !== sellerOutletId &&
        item.purchase?.seller?._id !== sellerOutletId
      ) {
        return false;
      }

      if (
        (!statusFilter || statusFilter === 'ALL') &&
        item.status === 'CANCELLED'
      )
        return false;
      if (
        statusFilter &&
        statusFilter !== 'ALL' &&
        item.status !== statusFilter
      )
        return false;
      return true;
    });
  }, [
    invoices,
    selectedMonth,
    selectedOutletId,
    statusFilter,
    sellerVendorId,
    sellerOutletId
  ]);

  const cardStats = useMemo(() => {
    let totalInvoiceAmount = 0;
    let confirmedCount = 0;
    let draftCount = 0;
    let linkedPoCount = 0;
    let totalCount = 0;

    filteredInvoices.forEach((inv: RTUInvoiceReconcile) => {
      if (inv.status === 'CANCELLED') return;

      totalInvoiceAmount += inv.totalAmount || 0;
      totalCount++;

      if (inv.status === 'CONFIRMED') {
        confirmedCount++;
      } else if (inv.status === 'DRAFT') {
        draftCount++;
      }

      if (inv.purchaseId) {
        linkedPoCount++;
      }
    });

    return {
      totalInvoiceAmount,
      confirmedCount,
      draftCount,
      linkedPoCount,
      totalCount
    };
  }, [filteredInvoices]);

  const columns = useMemo(
    () => [
      {
        header: '#',
        id: 'index',
        cell: (info: any) => (
          <div className="flex items-center justify-center py-1 min-h-[20px]">
            <span className="text-[11px] text-gray-500 font-medium">
              {info.row.index + 1}
            </span>
          </div>
        ),
        size: 40,
        sticky: 'left' as const
      },
      {
        header: 'Invoice Date',
        accessorKey: 'invoiceDate',
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-bold text-[11px] text-gray-700 whitespace-nowrap">
              {dayjs(info.getValue()).format('DD MMM YYYY HH:mm')}
            </span>
          </div>
        )
      },
      {
        header: 'Invoice Number',
        accessorKey: 'invoiceNumber',
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-mono font-bold text-[11px] text-indigo-600 tracking-tight whitespace-nowrap">
              {info.getValue()}
            </span>
          </div>
        )
      },
      {
        header: 'PO',
        id: 'poNumber',
        accessorFn: (row: any) => row.purchase?.docNumber,
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-bold text-[11px] text-gray-700 whitespace-nowrap">
              {info.getValue() || '-'}
            </span>
          </div>
        )
      },
      {
        header: 'Vendor / Supplier',
        id: 'vendorName',
        accessorFn: (row: any) => row.vendor?.name,
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-bold text-[11px] text-gray-800">
              {info.getValue() || 'Manual'}
            </span>
          </div>
        )
      },
      {
        header: 'GRN',
        id: 'grns',
        size: 170,
        cell: (info: any) => {
          const item = info.row.original as any;
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <GrnCell grns={item.grns || []} />
            </div>
          );
        }
      },
      {
        header: 'Items',
        accessorKey: 'items',
        cell: (info: any) => {
          const items = info.getValue() as any[];
          if (!items || items.length === 0)
            return <span className="text-[11px] text-gray-500">-</span>;
          return (
            <div className="flex flex-col gap-1 py-1">
              {items.map((item, idx) => {
                const name = item.material?.name || 'Unknown Item';
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center gap-4 text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                  >
                    <span
                      className="font-medium text-gray-700 truncate max-w-[150px]"
                      title={name}
                    >
                      {name}
                    </span>
                    <span className="font-black text-gray-900 whitespace-nowrap">
                      {item.qtyInvoiced}{' '}
                      <span className="text-[9px] text-gray-500 font-normal">
                        {item.unit}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      },
      {
        header: 'Brand',
        id: 'brand',
        cell: (info: any) => {
          const items = info.row.original.items as any[];
          if (!items || items.length === 0)
            return <span className="text-[11px] text-gray-500">-</span>;
          return (
            <div className="flex flex-col gap-1 py-1">
              {items.map((item, idx) => {
                const brand = item.material?.brand || '-';
                return (
                  <div
                    key={idx}
                    className="flex items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                  >
                    <span className="text-gray-600 font-medium whitespace-nowrap">
                      {brand}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      },
      {
        header: 'Status',
        accessorKey: 'status',
        align: 'center' as const,
        cell: (info: any) => {
          const status = info.getValue() as string;
          let className =
            'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50/90';
          if (status === 'CONFIRMED')
            className =
              'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50/90';
          if (status === 'CANCELLED')
            className =
              'bg-red-50 text-red-700 border-red-200 hover:bg-red-50/90';
          if (status === 'DRAFT')
            className =
              'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50/90';
          return (
            <div className="flex justify-center items-center py-1 min-h-[20px] w-full">
              <Badge
                variant="outline"
                className={`rounded-sm font-bold uppercase tracking-wider text-[9px] px-1.5 py-0 border ${className}`}
              >
                {status}
              </Badge>
            </div>
          );
        }
      },
      {
        header: 'Total Amount',
        accessorKey: 'totalAmount',
        align: 'right' as const,
        cell: (info: any) => (
          <div className="flex justify-end items-center py-1 min-h-[20px] w-full">
            <span className="font-bold text-[11px] text-gray-900">
              {toIDR(info.getValue())}
            </span>
          </div>
        )
      },
      {
        header: 'Catatan',
        accessorKey: 'notes',
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px] max-w-[200px]">
            <span
              className="text-[11px] text-gray-600 truncate"
              title={info.getValue() || ''}
            >
              {info.getValue() || '-'}
            </span>
          </div>
        )
      },
      {
        header: 'History',
        id: 'updateHistory',
        cell: (info: any) => {
          const item = info.row.original as RTUInvoiceReconcile;
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <UpdateHistoryCell
                histories={item.histories}
                creator={item.creator}
                createdAt={item.createdAt}
              />
            </div>
          );
        }
      },
      {
        header: 'Actions',
        id: 'actions',
        align: 'center' as const,
        sticky: 'right' as const,
        cell: (info: any) => {
          const item = info.row.original as RTUInvoiceReconcile;
          const isDraft = item.status === 'DRAFT';
          return (
            <div className="flex items-center justify-center gap-1.5 py-1 min-h-[20px]">
              <InvoiceDetailsDialog invoice={item} />
              {isDraft && canUpdate && <AddInvoiceDialog invoice={item} />}
            </div>
          );
        }
      }
    ],
    [canUpdate]
  );

  const handleExport = () => {
    const exportData = filteredInvoices.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      PO: inv.purchase?.docNumber || '-',
      Vendor: inv.vendor?.name || '-',
      Date: dayjs(inv.invoiceDate).format('YYYY-MM-DD'),
      Status: inv.status,
      'Total Amount (IDR)': inv.totalAmount
    }));
    exportToExcel(
      exportData,
      `RTU_Invoices_${new Date().toISOString().split('T')[0]}`,
      'Invoices'
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        <ReusableTitle
          title="Invoice Reconcile (AP Invoice)"
          subtitle="Dokumen keuangan rekonsiliasi tagihan vendor. Terpisah dari GRN (penerimaan barang)."
          borderColorClass="border-l-indigo-600"
          actions={
            <>
              <Button
                variant="outline"
                className="rounded-sm font-bold bg-white border-gray-200 gap-2 h-10 px-4 shadow-sm hover:bg-gray-50"
                onClick={handleExport}
                disabled={filteredInvoices.length === 0}
              >
                <Download className="w-4 h-4 text-indigo-600" /> Export Excel
              </Button>
              {canCreate && (
                <AddInvoiceDialog
                  initialPoId={initialPoId}
                  defaultOpen={createDialogOpen}
                  onClose={() => {
                    setCreateDialogOpen(false);
                    if (action === 'create') router.push('/rtu/invoice');
                  }}
                  customTrigger={
                    <Button variant="primary">
                      <Plus className="w-4 h-4" /> Buat Invoice
                    </Button>
                  }
                />
              )}
            </>
          }
          icon={Receipt}
          iconColorClass="text-indigo-400"
        />

        {/* Filters */}
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-64"
            label="Cabang Penerima"
            placeholder="Semua Cabang..."
            autoSelectFirst={false}
            save={true}
            saveKey="outletId"
          />
          <OutletSelector
            value={selectedSellerValue}
            onSelect={setSelectedSellerValue}
            className="w-full md:w-64"
            label="Penjual / Vendor"
            placeholder="Semua Penjual / Vendor..."
            autoSelectFirst={false}
            allowAll={true}
            includeVendors={true}
            save={true}
            saveKey="selectedSellerValue"
          />
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            save={true}
            saveKey="selectedMonth"
          />
          <div className="w-full md:w-48">
            <ReusableSelect
              label="Status"
              icon={Activity}
              value={statusFilter || 'ALL'}
              onChange={(v) => setStatusFilter(v === 'ALL' ? '' : String(v))}
              options={[
                { label: 'Semua Status', value: 'ALL' },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Dikonfirmasi', value: 'CONFIRMED' },
                { label: 'Dibatalkan', value: 'CANCELLED' }
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="statusFilter"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CountCard
            title="Total Nilai Invoice"
            value={toIDR(cardStats.totalInvoiceAmount)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Receipt}
            iconClassName="text-blue-600 bg-blue-50"
          />
          <CountCard
            title="Invoice Dikonfirmasi"
            value={cardStats.confirmedCount}
            subValue={`/ ${cardStats.totalCount} Invoice`}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CheckCircle}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            title="Draft Invoice (Outstanding)"
            value={cardStats.draftCount}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Clock}
            iconClassName="text-amber-600 bg-amber-50"
          />
          <CountCard
            title="Invoice Terkait PO"
            value={cardStats.linkedPoCount}
            subValue={`/ ${cardStats.totalCount} Invoice`}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Link}
            iconClassName="text-indigo-600 bg-indigo-50"
          />
        </div>

        {/* Table / Matrix tabs */}
        <ReusableTabs
          value={activeTab}
          onValueChange={handleTabChange}
          tabs={[
            { value: 'list', label: 'List View', icon: List },
            { value: 'table', label: 'Table', icon: TableIcon }
          ]}
          variant="blue"
          widthClass="md:w-[300px]"
          className="mb-6"
        />

        {activeTab === 'list' && (
          <div className="space-y-6 mt-0">
            <TableData
              data={filteredInvoices}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              isLoading={isDataLoading && filteredInvoices.length === 0}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-6 mt-0">
            <InvoiceMatrixTable
              invoices={filteredInvoices}
              isLoading={isDataLoading && filteredInvoices.length === 0}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              selectedMonth={selectedMonth}
              statusFilter={statusFilter}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={null}>
      <InvoicePageContent />
    </Suspense>
  );
}
