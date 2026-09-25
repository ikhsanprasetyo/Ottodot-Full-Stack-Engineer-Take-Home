'use client';

import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUGRN } from '@/lib/type/rtu_grn';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { GRNDetailsDialog } from './grn-details-dialog';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';

interface RTUGRNTableProps {
  dataArray: RTUGRN[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
}

export function RTUGRNTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading
}: RTUGRNTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'receiptDate', desc: true }
  ]);
  const [selectedGrn, setSelectedGrn] = useState<RTUGRN | null>(null);

  const columns = [
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
      size: 15,
      sticky: 'left' as const
    },
    {
      header: 'Receipt Date',
      accessorKey: 'receiptDate',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-bold text-[11px] text-gray-700 whitespace-nowrap">
            {dayjs(info.getValue()).format('DD MMM YYYY HH:mm')}
          </span>
        </div>
      )
    },
    {
      header: 'GRN Number',
      accessorKey: 'grnNumber',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-mono font-bold text-[11px] text-blue-600 tracking-tight">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Vendor',
      id: 'vendorName',
      accessorFn: (row: any) => row.vendor?.name,
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-bold text-[11px] text-gray-800">
            {info.getValue() || '-'}
          </span>
        </div>
      )
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
              const name =
                item.material?.name || item.product?.name || 'Unknown Item';
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
                  <span className="font-semibold text-gray-900 whitespace-nowrap">
                    {item.qtyReceived}{' '}
                    <span className="text-[9px] text-gray-500">
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
        let variant: 'default' | 'destructive' | 'secondary' | 'outline' =
          'outline';

        if (status === 'CONFIRMED') variant = 'default'; // Success usually green in shadcn but default is dark
        if (status === 'CANCELLED') variant = 'destructive';
        if (status === 'DRAFT') variant = 'secondary';

        return (
          <div className="flex justify-center items-center py-1 min-h-[20px] w-full">
            <Badge
              variant={variant}
              className="text-[9px] font-bold px-1.5 py-0 rounded-sm"
            >
              {status}
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'Catatan',
      accessorKey: 'notes',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px] max-w-[200px]">
          <span
            className="text-[11px] text-gray-600 truncate"
            title={info.getValue() || '-'}
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
        const item = info.row.original as RTUGRN;
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
        const item = info.row.original;
        return (
          <div className="flex items-center justify-center gap-1 py-1 min-h-[20px]">
            <Button
              variant="ghost"
              size="icon"
              icon={Eye}
              className="h-8 w-8 p-0 rounded-sm hover:bg-blue-50 text-blue-600 animate-none transition-colors"
              type="button"
              title="Lihat Rincian GRN"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGrn(item);
              }}
            />
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full space-y-4">
      <TableData
        data={dataArray}
        columns={columns}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
      />
      {selectedGrn && (
        <GRNDetailsDialog
          grn={
            dataArray.find((g: any) => g._id === selectedGrn._id) || selectedGrn
          }
          open={!!selectedGrn}
          onOpenChange={(v) => !v && setSelectedGrn(null)}
          onClose={() => setSelectedGrn(null)}
        />
      )}
    </div>
  );
}
