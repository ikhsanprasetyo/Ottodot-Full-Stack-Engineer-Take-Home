'use client';

import { useMemo, useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { useGetRTUHppMatrix, RTUMonthlyHPP } from '@/lib/hooks/queries/rtu-hpp';
import { formatFullIDR } from '@/lib/number';
import { TableData } from '@/components/ui/table-data';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';

interface HppMatrixTableProps {
  year: string;
}

const MONTHS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12'
];

export function HppMatrixTable({ year }: HppMatrixTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'outletName', desc: false }
  ]);

  const {
    data: hppData,
    isLoading: isLoadingHpp,
    isFetching: isFetchingHpp
  } = useGetRTUHppMatrix(year);
  const {
    data: outletsData,
    isLoading: isLoadingOutlets,
    isFetching: isFetchingOutlets
  } = useGetOutlets(0, 100, '', false, 'name', false);

  const isLoading =
    isLoadingHpp || isLoadingOutlets || isFetchingHpp || isFetchingOutlets;

  const matrix = useMemo(() => {
    if (!outletsData?.data || !hppData?.data) return [];

    const ckOutlets = outletsData.data.filter(
      (o: any) => o.type === 'central kitchen'
    );

    return ckOutlets.map((outlet: any) => {
      const row: any = {
        outletId: outlet._id,
        outletName: outlet.label
      };

      MONTHS.forEach((month) => {
        const monthYear = `${year}-${month}`;
        const hpp = hppData.data.find(
          (h: RTUMonthlyHPP) =>
            h.outletId === outlet._id && h.monthYear === monthYear
        );

        if (hpp) {
          row[month] = {
            total: hpp.totalLaborCost + hpp.totalOverheadCost,
            labor: hpp.totalLaborCost,
            overhead: hpp.totalOverheadCost
          };
        } else {
          row[month] = null;
        }
      });

      return row;
    });
  }, [outletsData, hppData, year]);

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        header: 'Cabang',
        accessorKey: 'outletName',
        size: 200,
        sticky: 'left',
        cell: (info: any) => (
          <div className="py-0 font-bold text-gray-900 whitespace-nowrap text-xs">
            {info.getValue()}
          </div>
        )
      }
    ];

    MONTHS.forEach((month) => {
      const monthName = new Date(`${year}-${month}-01`).toLocaleString(
        'id-ID',
        {
          month: 'short'
        }
      );
      cols.push({
        header: monthName,
        id: month,
        accessorFn: (row: any) => row[month]?.total || 0,
        size: 120,
        align: 'center',
        cell: (info: any) => {
          const val = info.row.original[month];
          if (!val) {
            return (
              <div className="flex items-center justify-center w-full min-h-[1.5rem]">
                <span className="text-gray-300">-</span>
              </div>
            );
          }

          return (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full min-h-[1.5rem] flex items-center justify-center px-2 cursor-help hover:bg-blue-50/50 transition-colors">
                    <span className="font-bold text-gray-900 text-[11px]">
                      {formatFullIDR(val.total)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border-0 z-[100]"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-1 mb-2">
                      Rincian Biaya
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Biaya Upah</p>
                        <p className="font-bold text-blue-400">
                          {formatFullIDR(val.labor)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Biaya Overhead</p>
                        <p className="font-bold text-purple-400">
                          {formatFullIDR(val.overhead)}
                        </p>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      });
    });

    return cols;
  }, [year]);

  return (
    <TableData
      data={matrix}
      columns={columns}
      sorting={sorting}
      onSortingChange={setSorting}
      globalFilter={globalFilter}
      setGlobalFilter={setGlobalFilter}
      isLoading={isLoading}
    />
  );
}
