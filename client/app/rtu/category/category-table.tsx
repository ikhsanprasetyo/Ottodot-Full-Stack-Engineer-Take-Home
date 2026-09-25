'use client';

import { useState, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUCategory } from '@/lib/type/rtu_category';
import { Badge } from '@/components/ui/badge';
import { EditCategoryButton } from './edit-category-dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRestoreRTUCategory,
  useHardDeleteRTUCategory
} from '@/lib/hooks/mutation/rtu-category';
import { DeleteCategoryButton } from './delete-category-button';

interface CategoryTableProps {
  dataArray: RTUCategory[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
  isDeletedMode?: boolean;
}

export function CategoryTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading,
  isDeletedMode = false
}: CategoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const queryClient = useQueryClient();
  const { mutate: restoreCategory } = useRestoreRTUCategory();
  const { mutate: hardDeleteCategory } = useHardDeleteRTUCategory();

  const handleRestore = useCallback(
    (item: RTUCategory) => {
      if (
        confirm(`Apakah Anda yakin ingin memulihkan Kategori "${item.name}"?`)
      ) {
        restoreCategory(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Kategori berhasil dipulihkan!');
            queryClient.invalidateQueries({ queryKey: ['rtu-categories'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal memulihkan kategori'
            );
          }
        });
      }
    },
    [restoreCategory, queryClient]
  );

  const handleHardDelete = useCallback(
    (item: RTUCategory) => {
      if (
        confirm(
          `Apakah Anda yakin ingin MENGHAPUS PERMANEN Kategori "${item.name}"? Tindakan ini tidak dapat dibatalkan.`
        )
      ) {
        hardDeleteCategory(item._id, {
          onSuccess: (res) => {
            toast.success(
              res?.message || 'Kategori berhasil dihapus permanen!'
            );
            queryClient.invalidateQueries({ queryKey: ['rtu-categories'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal menghapus permanen'
            );
          }
        });
      }
    },
    [hardDeleteCategory, queryClient]
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
      header: 'Nama Kategori',
      accessorKey: 'name',
      size: 500,
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-bold text-[11px] text-gray-800">
            {info.getValue()}
          </span>
        </div>
      )
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
            <EditCategoryButton category={item} />
            <DeleteCategoryButton category={item} />
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
