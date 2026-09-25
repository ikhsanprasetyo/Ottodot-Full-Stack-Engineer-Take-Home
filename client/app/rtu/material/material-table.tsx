'use client';

import { useState, useMemo, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { Badge } from '@/components/ui/badge';

import { EditMaterialButton } from './edit-material-dialog';
import { DeleteMaterialButton } from './delete-material-button';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { PriceHistoryDialog } from './price-history-dialog';
import { SetOutletVendorDialog } from './set-outlet-vendor-dialog';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import {
  Image as ImageIcon,
  DollarSign,
  Scale,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { getImageUrl, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import { ImagePreviewDialog } from '@/components/shared/image-preview-dialog';
import Image from 'next/image';
import {
  MultiUnitBadges,
  MultiUnitPriceBadges
} from '@/components/shared/multi-unit-badges';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useRestoreRTUMaterial,
  useHardDeleteRTUMaterial
} from '@/lib/hooks/mutation/rtu-material';

interface RTUMaterialTableProps {
  dataArray: RTUMaterial[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
  selectedOutletId?: string;
  isDeletedMode?: boolean;
}

export function RTUMaterialTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading,
  selectedOutletId,
  isDeletedMode = false
}: RTUMaterialTableProps) {
  const queryClient = useQueryClient();
  const { mutate: restoreMaterial } = useRestoreRTUMaterial();
  const { mutate: hardDeleteMaterial } = useHardDeleteRTUMaterial();

  const handleRestore = useCallback(
    (item: RTUMaterial) => {
      if (
        confirm(`Apakah Anda yakin ingin memulihkan Bahan Baku "${item.name}"?`)
      ) {
        restoreMaterial(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Bahan baku berhasil dipulihkan!');
            queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal memulihkan bahan baku'
            );
          }
        });
      }
    },
    [restoreMaterial, queryClient]
  );

  const handleHardDelete = useCallback(
    (item: RTUMaterial) => {
      if (
        confirm(
          `Apakah Anda yakin ingin MENGHAPUS PERMANEN Bahan Baku "${item.name}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua riwayat ledger terkait.`
        )
      ) {
        hardDeleteMaterial(item._id, {
          onSuccess: (res) => {
            toast.success(
              res?.message || 'Bahan baku berhasil dihapus permanen!'
            );
            queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal menghapus permanen'
            );
          }
        });
      }
    },
    [hardDeleteMaterial, queryClient]
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false }
  ]);
  const [priceHistoryMaterial, setPriceHistoryMaterial] =
    useState<RTUMaterial | null>(null);

  // Preview Image states
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const columns = useMemo(
    () => [
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
        header: 'Code',
        accessorKey: 'code',
        cell: (info: any) => (
          <div className="py-0">
            <span className="font-mono text-[11px] font-bold text-gray-700">
              {info.getValue()}
            </span>
          </div>
        )
      },
      {
        header: 'Name',
        accessorKey: 'name',
        cell: (info: any) => {
          const material = info.row.original;
          return (
            <div className="flex items-start gap-2 py-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-200 overflow-hidden flex-shrink-0 transition-colors duration-200',
                  material.imageUrl && 'cursor-pointer hover:border-brand-500'
                )}
                onClick={() => {
                  if (material.imageUrl) {
                    setPreviewImage({
                      url: material.imageUrl,
                      name: material.name
                    });
                  }
                }}
              >
                {material.imageUrl ? (
                  <Image
                    src={getImageUrl(material?.imageUrl)}
                    alt={material.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <span className="font-bold text-[11px] text-gray-800">
                  {material.name}
                </span>
              </div>
            </div>
          );
        }
      },
      {
        header: 'Brand',
        accessorKey: 'brand',
        cell: (info: any) => (
          <div className="py-0">
            <span className="text-[11px] text-gray-600 font-medium">
              {info.getValue() || '-'}
            </span>
          </div>
        )
      },
      {
        header: 'Category',
        accessorKey: 'category',
        cell: (info: any) => (
          <div className="py-0">
            <span className="text-[11px] text-gray-600">{info.getValue()}</span>
          </div>
        )
      },
      {
        header: 'Price (Rp)',
        accessorKey: 'currentPrice',
        cell: (info: any) => {
          const material = info.row.original;
          const basePrice = info.getValue() as number;
          const unit = material.unit;
          const units = material.units || [];

          return (
            <MultiUnitPriceBadges
              basePrice={basePrice}
              baseUnit={unit}
              units={units}
            />
          );
        }
      },
      {
        header: 'Stock',
        accessorKey: 'currentStock',
        cell: (info: any) => {
          const stock = info.getValue() as number;
          const minStock = info.row.original.minStock as number;
          const unit = info.row.original.unit;
          const units = info.row.original.units || [];

          let badgeVariant: 'default' | 'destructive' | 'secondary' = 'default';
          if (stock <= 0) badgeVariant = 'destructive';
          else if (stock < minStock) badgeVariant = 'destructive';

          return (
            <div className="flex flex-col gap-0 py-0 items-start">
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-85">
                      <Badge
                        variant={badgeVariant}
                        className="text-[9px] font-bold px-1.5 py-0 rounded-sm"
                      >
                        {stock.toLocaleString('id-ID')} {unit}
                      </Badge>
                      {units.length > 0 && (
                        <span className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Scale className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  {units.length > 0 && (
                    <TooltipContent className="bg-white border border-gray-100 shadow-xl p-3 rounded-sm min-w-56 text-xs text-gray-800">
                      <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1.5 flex items-center justify-between">
                        <span>Stok Konversi</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          Base: {unit}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {units.map((u: any, idx: number) => {
                          const converted = stock / u.conversion;
                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-0.5"
                            >
                              <span className="text-gray-500 font-medium">
                                {u.unitName}
                              </span>
                              <span className="font-bold font-mono text-gray-900">
                                {Number(converted.toFixed(3)).toLocaleString(
                                  'id-ID'
                                )}{' '}
                                {u.unitName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <span className="text-[9.5px] font-medium leading-tight mt-0.5 whitespace-nowrap">
                <span className="text-gray-400">Min:</span>{' '}
                <span
                  className={
                    stock < minStock
                      ? 'text-red-500 font-bold'
                      : 'text-gray-500 font-semibold'
                  }
                >
                  {(minStock ?? 0).toLocaleString('id-ID')} {unit}
                </span>
              </span>
            </div>
          );
        }
      },
      {
        header: 'Satuan & Konversi',
        id: 'units_conversions',
        cell: (info: any) => {
          const material = info.row.original;
          const unit = material.unit;
          const units = material.units || [];

          return <MultiUnitBadges unit={unit} units={units} />;
        }
      },
      {
        header: 'Vendor',
        id: 'vendorName',
        accessorFn: (row: RTUMaterial) => row.vendor?.name,
        cell: (info: any) => (
          <div className="py-0">
            <span className="font-bold text-[11px] text-gray-800 leading-none">
              {info.getValue() || '-'}
            </span>
          </div>
        )
      },
      {
        header: 'Catatan',
        accessorKey: 'description',
        cell: (info: any) => (
          <div
            className="py-0 max-w-[200px] truncate"
            title={info.getValue() || ''}
          >
            <span className="text-[11px] text-gray-500 font-medium leading-normal">
              {info.getValue() || '-'}
            </span>
          </div>
        )
      },
      {
        header: 'History',
        id: 'updateHistory',
        cell: (info: any) => {
          const item = info.row.original as RTUMaterial;
          return (
            <div className="flex items-center py-0">
              <UpdateHistoryCell
                histories={(item as any).histories}
                creator={(item as any).creator}
                updater={(item as any).updater}
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

          if (isDeletedMode) {
            return (
              <div className="flex flex-row justify-center gap-2 py-0">
                <Button
                  variant="outline"
                  className="h-6 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border-emerald-200"
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
              <AdjustStockDialog
                material={item}
                defaultOutletId={selectedOutletId}
              />
              <SetOutletVendorDialog
                material={item}
                defaultOutletId={selectedOutletId}
              />
              <Button
                variant="outline"
                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                onClick={() => setPriceHistoryMaterial(item)}
              >
                <DollarSign className="h-3.5 w-3.5" />
              </Button>
              <EditMaterialButton material={item} />
              <DeleteMaterialButton material={item} />
            </div>
          );
        }
      }
    ],
    [selectedOutletId, isDeletedMode, handleRestore, handleHardDelete]
  );

  // Sync material reference dynamically when data updates from query invalidation
  // Ini memastikan dialog yang sedang terbuka selalu mendapat data material terbaru
  const activeMaterial = useMemo(() => {
    if (!priceHistoryMaterial) return null;
    return (
      dataArray.find((m) => m._id === priceHistoryMaterial._id) ||
      priceHistoryMaterial
    );
  }, [dataArray, priceHistoryMaterial]);

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

      {activeMaterial && (
        <PriceHistoryDialog
          material={activeMaterial}
          selectedOutletId={selectedOutletId}
          isOpen={!!priceHistoryMaterial}
          onClose={() => setPriceHistoryMaterial(null)}
        />
      )}

      <ImagePreviewDialog
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        imageName={previewImage?.name || ''}
      />
    </div>
  );
}
