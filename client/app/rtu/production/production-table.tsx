'use client';

import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { BatchDetailsDialog } from './batch-details-dialog';
import { EditBatchDialog } from './edit-batch-dialog';
import { DeleteBatchDialog } from './delete-batch-dialog';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { toIDR } from '@/lib/utils';

interface RTUProductionBatchTableProps {
  dataArray: RTUProductionBatch[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
}

export function RTUProductionBatchTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading
}: RTUProductionBatchTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'plannedDate', desc: true }
  ]);
  const columns = [
    {
      header: '#',
      id: 'index',
      align: 'center' as const,
      cell: (info: any) => (
        <div className="flex items-center justify-center py-1 min-h-[20px]">
          <span className="text-[11px] text-gray-500 font-medium">
            {info.row.index + 1}
          </span>
        </div>
      ),
      size: 15
    },
    {
      header: 'Date',
      accessorKey: 'plannedDate',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="text-[11px] font-medium text-gray-800">
            {dayjs(info.getValue()).format('DD MMM YYYY')}
          </span>
        </div>
      )
    },
    {
      header: 'Batch ID',
      accessorKey: 'batchNumber',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-mono font-bold text-[11px] text-orange-600">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Cabang',
      id: 'outletName',
      accessorFn: (row: any) => row.outlet?.label || row.outlet?.name,
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="text-[11px] font-medium text-gray-800">
            {info.getValue() || '-'}
          </span>
        </div>
      )
    },
    {
      header: 'Product',
      id: 'productName',
      accessorFn: (row: any) => row.product?.name,
      cell: (info: any) => (
        <div className="flex flex-col justify-center py-1 min-h-[20px]">
          <span className="font-medium text-[11px] text-gray-900 mb-0.5">
            {info.getValue() || '-'}
          </span>
          <span className="text-[9px] text-gray-400 font-mono italic">
            {info.row.original.recipeVersion?.versionNumber
              ? `v${info.row.original.recipeVersion?.versionNumber}`
              : ''}
          </span>
        </div>
      )
    },
    {
      header: 'Qty',
      accessorKey: 'actualQty',
      align: 'right' as const,
      cell: (info: any) => (
        <div className="flex items-center justify-end py-1 min-h-[20px] w-full gap-1">
          <span className="font-medium text-[11px]">{info.getValue()}</span>
          <span className="text-[9px] text-gray-400 font-medium">
            {info.row.original.product?.outputUnit}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center' as const,
      cell: (info: any) => {
        const status = info.getValue() as string;
        let variant: 'default' | 'destructive' | 'secondary' | 'outline' =
          'outline';

        switch (status) {
          case 'planned':
            variant = 'secondary';
            break;
          case 'in_progress':
            variant = 'outline';
            break;
          case 'completed':
            variant = 'default';
            break;
          case 'cancelled':
            variant = 'destructive';
            break;
        }

        return (
          <div className="flex items-center justify-center py-1 min-h-[20px]">
            <Badge
              variant={variant}
              className="capitalize rounded-sm text-[9px] px-1.5 py-0"
            >
              {status.replace('_', ' ')}
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'Total Cost (Rp)',
      accessorKey: 'totalCost',
      align: 'right' as const,
      cell: (info: any) => {
        const val = info.getValue();
        if (info.row.original.status === 'planned')
          return (
            <div className="flex items-center justify-end py-1 min-h-[20px] w-full">
              <span className="text-gray-300 italic text-[10px]">
                Estimated...
              </span>
            </div>
          );
        return (
          <div className="flex items-center justify-end py-1 min-h-[20px] w-full">
            <span className="text-[11px] font-medium text-gray-700">
              {toIDR(val)}
            </span>
          </div>
        );
      }
    },
    {
      header: 'History',
      id: 'updateHistory',
      cell: (info: any) => {
        const item = info.row.original as RTUProductionBatch;
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
        const item = info.row.original as RTUProductionBatch;
        const isEditable = item.status !== 'cancelled';

        return (
          <div className="flex flex-row items-center justify-center gap-1.5 py-1 min-h-[20px]">
            <BatchDetailsDialog batch={item} />
            {isEditable && (
              <>
                <EditBatchDialog batch={item} />
                <DeleteBatchDialog batch={item} />
              </>
            )}
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
    </div>
  );
}
