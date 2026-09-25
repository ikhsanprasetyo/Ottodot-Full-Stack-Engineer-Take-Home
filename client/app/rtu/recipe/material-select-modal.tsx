'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { TableData } from '@/components/ui/table-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus } from 'lucide-react';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { Checkbox } from '@/components/ui/checkbox';

interface MaterialSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: RTUMaterial[];
  isLoading: boolean;
  onSelect: (materials: RTUMaterial[]) => void;
  multiSelect?: boolean;
}

export function MaterialSelectModal({
  open,
  onOpenChange,
  materials,
  isLoading,
  onSelect,
  multiSelect = false
}: MaterialSelectModalProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<any>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const toggleSelect = useMemo(
    () => (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedIds(newSet);
    },
    [selectedIds]
  );

  const handleConfirm = () => {
    const selectedMaterials = materials.filter((m) => selectedIds.has(m._id));
    onSelect(selectedMaterials);
    onOpenChange(false);
  };

  const columns = useMemo(() => {
    const baseCols = [
      {
        header: 'Code',
        accessorKey: 'code',
        size: 80
      },
      {
        header: 'Material Name',
        accessorKey: 'name',
        cell: (info: any) => (
          <span className="font-semibold text-gray-900">{info.getValue()}</span>
        ),
        size: 200
      },
      {
        header: 'Category',
        accessorKey: 'category',
        size: 100
      },
      {
        header: 'Unit',
        accessorKey: 'unit',
        cell: (info: any) => (
          <Badge variant="secondary">{info.getValue()}</Badge>
        ),
        size: 80
      }
    ];

    if (multiSelect) {
      return [
        {
          id: 'selection',
          header: () => (
            <div className="flex justify-center">
              <Checkbox
                checked={
                  selectedIds.size === materials.length && materials.length > 0
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedIds(new Set(materials.map((m) => m._id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
            </div>
          ),
          cell: ({ row }: any) => (
            <div className="flex justify-center">
              <Checkbox
                checked={selectedIds.has(row.original._id)}
                onCheckedChange={() => toggleSelect(row.original._id)}
              />
            </div>
          ),
          size: 40,
          sticky: 'left' as const
        },
        ...baseCols
      ];
    }

    return [
      ...baseCols,
      {
        header: 'Action',
        id: 'select',
        cell: ({ row }: any) => {
          const material = row.original;
          return (
            <Button
              size="sm"
              onClick={() => {
                onSelect([material]);
                onOpenChange(false);
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white gap-2"
            >
              <Check className="h-4 w-4" /> Pilih
            </Button>
          );
        },
        size: 80,
        sticky: 'right' as const
      }
    ];
  }, [
    multiSelect,
    selectedIds,
    materials,
    onSelect,
    onOpenChange,
    toggleSelect
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 shadow-2xl border-none">
        <DialogHeader className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-800 tracking-tight">
                {multiSelect ? '📦 Pilih Banyak Bahan' : '🎯 Pilih Bahan Baku'}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {multiSelect
                  ? 'Gunakan checkbox untuk memilih beberapa bahan sekaligus.'
                  : 'Cari bahan baku yang ingin kamu tambahkan ke formulasi resep.'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-2">
          <div className="rounded-sm border border-slate-100 overflow-hidden shadow-inner bg-slate-50/30">
            <TableData
              data={materials}
              columns={columns}
              isLoading={isLoading}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              sorting={sorting}
              onSortingChange={setSorting}
              hidePagination={materials.length <= 10}
              tableContainerClassName="max-h-[50vh]"
            />
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
          <div className="flex justify-between w-full items-center">
            {multiSelect && (
              <div className="text-sm font-medium text-slate-600">
                <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded-sm mr-2 font-bold">
                  {selectedIds.size}
                </span>
                Bahan dipilih
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-500 hover:bg-slate-100"
              >
                Batal
              </Button>
              {multiSelect && (
                <Button
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-8 font-bold shadow-lg shadow-brand-200 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambahkan Ke Resep
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
