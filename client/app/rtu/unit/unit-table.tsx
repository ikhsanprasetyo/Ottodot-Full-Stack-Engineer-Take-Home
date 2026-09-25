'use client';

import { useState, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUUnit } from '@/lib/type/rtu_unit';
import { UNIT_LEVELS } from '@/lib/type/rtu_unit';
import { Badge } from '@/components/ui/badge';
import { EditUnitButton } from './edit-unit-dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRestoreRTUUnit,
  useHardDeleteRTUUnit
} from '@/lib/hooks/mutation/rtu-unit';
import { DeleteUnitButton } from './delete-unit-button';

interface UnitTableProps {
  dataArray: RTUUnit[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
  isDeletedMode?: boolean;
}

export function UnitTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading,
  isDeletedMode = false
}: UnitTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'level', desc: true },
    { id: 'name', desc: false }
  ]);
  const queryClient = useQueryClient();
  const { mutate: restoreUnit } = useRestoreRTUUnit();
  const { mutate: hardDeleteUnit } = useHardDeleteRTUUnit();

  const handleRestore = useCallback(
    (item: RTUUnit) => {
      if (
        confirm(`Apakah Anda yakin ingin memulihkan Satuan "${item.name}"?`)
      ) {
        restoreUnit(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Satuan berhasil dipulihkan!');
            queryClient.invalidateQueries({ queryKey: ['rtu-units'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal memulihkan satuan'
            );
          }
        });
      }
    },
    [restoreUnit, queryClient]
  );

  const handleHardDelete = useCallback(
    (item: RTUUnit) => {
      if (
        confirm(
          `Apakah Anda yakin ingin MENGHAPUS PERMANEN Satuan "${item.name}"? Tindakan ini tidak dapat dibatalkan.`
        )
      ) {
        hardDeleteUnit(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Satuan berhasil dihapus permanen!');
            queryClient.invalidateQueries({ queryKey: ['rtu-units'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal menghapus permanen'
            );
          }
        });
      }
    },
    [hardDeleteUnit, queryClient]
  );

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
      header: 'Nama Satuan',
      accessorKey: 'name',
      size: 500,
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-bold text-[11px] text-gray-800 font-mono">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Level',
      accessorKey: 'level',
      cell: (info: any) => {
        const lvl = Number(info.getValue() ?? 1);
        const meta = UNIT_LEVELS.find((l) => l.value === lvl);
        return (
          <div className="py-0">
            <span
              className={`text-[9px] font-bold px-1.5 py-0 rounded-sm ${
                meta?.color ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              L{lvl}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (info: any) => {
        const isActive = info.getValue() as boolean;
        return (
          <div className="py-0">
            <Badge
              variant={isActive ? 'default' : 'secondary'}
              className={`text-[9px] font-bold px-1.5 py-0 rounded-sm ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isActive ? 'Aktif' : 'Non-Aktif'}
            </Badge>
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

        if (isDeletedMode) {
          return (
            <div className="flex flex-row justify-center gap-2 py-0">
              <Button
                variant="outline"
                className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border-blue-200"
                onClick={() => handleRestore(item)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Pulihkan
              </Button>
              <Button
                variant="destructive"
                className="h-6 px-2 text-white bg-red-600 hover:bg-red-700 transition-colors"
                onClick={() => handleHardDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Permanen
              </Button>
            </div>
          );
        }

        return (
          <div className="flex flex-row justify-center gap-1 py-0">
            <EditUnitButton unit={item} />
            <DeleteUnitButton unit={item} />
          </div>
        );
      }
    }
  ];

  return (
    <TableData
      data={dataArray}
      columns={columns}
      sorting={sorting}
      onSortingChange={setSorting}
      globalFilter={globalFilter}
      setGlobalFilter={setGlobalFilter}
      isLoading={isLoading}
    />
  );
}
