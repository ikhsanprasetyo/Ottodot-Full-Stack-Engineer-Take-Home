'use client';

import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { Edit } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id'; // For Indonesian month names

import { TableData } from '@/components/ui/table-data';
import { Button } from '@/components/ui/button';
import { formatFullIDR } from '@/lib/number';
import {
  useGetAllRTUMonthlyHPP,
  RTUMonthlyHPP
} from '@/lib/hooks/queries/rtu-hpp';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';

dayjs.locale('id');

interface HppTableProps {
  outletId: string;
  year: string;
  onEdit: (monthYear: string) => void;
}

export function HppTable({ outletId, year, onEdit }: HppTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'monthYear', desc: true }
  ]);

  const { data, isFetching } = useGetAllRTUMonthlyHPP(outletId, year);
  const hpps: RTUMonthlyHPP[] = data?.data || [];

  const columns = [
    {
      header: '#',
      id: 'index',
      cell: (info: any) => (
        <div className="py-0">
          <span className="text-[11px] text-gray-500 font-medium">
            {info.row.index + 1}
          </span>
        </div>
      ),
      size: 15,
      sticky: 'left' as const
    },
    {
      header: 'Bulan & Tahun',
      accessorKey: 'monthYear',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <div className="py-0">
            <span className="font-bold text-[11px] text-gray-800 whitespace-nowrap capitalize">
              {dayjs(val).format('MMMM YYYY')}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Biaya Upah Karyawan',
      accessorKey: 'totalLaborCost',
      cell: (info: any) => {
        const val = info.getValue() as number;
        return (
          <div className="py-0">
            <span className="font-bold text-[11px] text-blue-700">
              {formatFullIDR(val || 0)}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Biaya Overhead',
      accessorKey: 'totalOverheadCost',
      cell: (info: any) => {
        const val = info.getValue() as number;
        return (
          <div className="py-0">
            <span className="font-bold text-[11px] text-purple-700">
              {formatFullIDR(val || 0)}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Total Biaya Operasional',
      id: 'totalOperational',
      cell: (info: any) => {
        const labor = info.row.original.totalLaborCost || 0;
        const overhead = info.row.original.totalOverheadCost || 0;
        const total = labor + overhead;
        return (
          <div className="py-0">
            <span className="font-black text-[12px] text-gray-900">
              {formatFullIDR(total)}
            </span>
          </div>
        );
      }
    },
    {
      header: 'History',
      id: 'updateHistory',
      cell: (info: any) => {
        const item = info.row.original as RTUMonthlyHPP;
        return (
          <UpdateHistoryCell
            histories={item.histories}
            creator={item.creator}
            createdAt={item.createdAt}
          />
        );
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      align: 'center' as const,
      sticky: 'right' as const,
      cell: (info: any) => {
        const item = info.row.original as RTUMonthlyHPP;
        return (
          <div className="flex items-center justify-center gap-1 py-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold gap-1 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-sm"
              onClick={() => onEdit(item.monthYear)}
            >
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <TableData
      data={hpps}
      columns={columns}
      sorting={sorting}
      onSortingChange={setSorting}
      globalFilter={globalFilter}
      setGlobalFilter={setGlobalFilter}
      isLoading={isFetching}
    />
  );
}
