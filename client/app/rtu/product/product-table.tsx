'use client';

import { useState, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUProduct } from '@/lib/type/rtu_product';
import { Badge } from '@/components/ui/badge';
import { ActiveStatusBadge } from '@/components/ui/active-status-badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';

import { EditProductDialog } from './edit-product-dialog';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { Button } from '@/components/ui/button';
import { BookOpen, Image as ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useRestoreRTUProduct,
  useHardDeleteRTUProduct
} from '@/lib/hooks/mutation/rtu-product';
import { DeleteProductButton } from './delete-product-button';
import { getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { MultiUnitBadges } from '@/components/shared/multi-unit-badges';

interface RTUProductTableProps {
  dataArray: RTUProduct[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
  isDeletedMode?: boolean;
}

export function RTUProductTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading,
  isDeletedMode = false
}: RTUProductTableProps) {
  const queryClient = useQueryClient();
  const { mutate: restoreProduct } = useRestoreRTUProduct();
  const { mutate: hardDeleteProduct } = useHardDeleteRTUProduct();

  const handleRestore = useCallback(
    (item: RTUProduct) => {
      if (
        confirm(`Apakah Anda yakin ingin memulihkan Produk "${item.name}"?`)
      ) {
        restoreProduct(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Produk berhasil dipulihkan!');
            queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal memulihkan produk'
            );
          }
        });
      }
    },
    [restoreProduct, queryClient]
  );

  const handleHardDelete = useCallback(
    (item: RTUProduct) => {
      if (
        confirm(
          `Apakah Anda yakin ingin MENGHAPUS PERMANEN Produk "${item.name}"? Tindakan ini tidak dapat dibatalkan.`
        )
      ) {
        hardDeleteProduct(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Produk berhasil dihapus permanen!');
            queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal menghapus permanen'
            );
          }
        });
      }
    },
    [hardDeleteProduct, queryClient]
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false }
  ]);

  const columns = [
    {
      header: '#',
      id: 'index',
      cell: (info: any) => (
        <div className="flex items-center py-0">
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
        <div className="flex items-center py-0">
          <span className="font-mono text-[11px] font-bold text-gray-700">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Product Name',
      accessorKey: 'name',
      cell: (info: any) => {
        const product = info.row.original;
        return (
          <div className="flex items-start gap-2 py-0">
            <div className="w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-200 overflow-hidden flex-shrink-0">
              {product.imageUrl ? (
                <Image
                  src={getImageUrl(product?.imageUrl)}
                  alt={product.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div>
              <span className="font-bold text-[11px] text-brand-700">
                {product.name}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (info: any) => (
        <div className="flex items-center py-0">
          <span className="text-[11px] text-gray-600">{info.getValue()}</span>
        </div>
      )
    },
    {
      header: 'Output Unit',
      accessorKey: 'outputUnit',
      cell: (info: any) => (
        <div className="flex items-center py-0">
          <Badge
            variant="secondary"
            className="text-[9px] font-bold px-1.5 py-0 rounded-sm"
          >
            {info.getValue()}
          </Badge>
        </div>
      )
    },
    {
      header: 'Satuan & Konversi',
      id: 'units_conversions',
      cell: (info: any) => {
        const product = info.row.original;
        const unit = product.outputUnit;
        const units = product.units || [];

        return <MultiUnitBadges unit={unit} units={units} />;
      }
    },
    {
      header: 'Resep (Latest)',
      accessorKey: 'recipe',
      cell: (info: any) => {
        const product = info.row.original as RTUProduct;
        const recipe = info.getValue() as RTUProduct['recipe'];
        if (!recipe) {
          return (
            <div className="py-0.5">
              <Badge
                variant="outline"
                className="text-gray-400 text-[9px] font-bold px-1.5 py-0 rounded-sm select-none"
              >
                No Recipe
              </Badge>
            </div>
          );
        }

        const versions = recipe.versions || [];
        const activeVersion = versions.find((v) => v.status === 'active');

        if (activeVersion) {
          const ingredients = activeVersion.ingredients || [];
          const summaryText = ingredients
            .map((ing) => ing.material?.name || 'Bahan')
            .slice(0, 3)
            .join(', ');
          const hasMore = ingredients.length > 3;
          const totalCount = ingredients.length;

          return (
            <div className="flex flex-col gap-1 py-0.5 max-w-[200px]">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="default"
                  className="w-max bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0 rounded-sm select-none"
                >
                  v{activeVersion.versionNumber} (Locked)
                </Badge>
                <span className="text-[9px] text-gray-400 font-mono select-none">
                  out: {activeVersion.expectedOutput} {product.outputUnit}
                </span>
              </div>
              {ingredients.length > 0 ? (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="text-[10px] text-gray-500 font-medium truncate cursor-pointer hover:text-indigo-600 transition-colors">
                      {summaryText}
                      {hasMore && ` +${totalCount - 3} lainnya`}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-[10px] py-2 px-3 max-w-[250px]"
                  >
                    <div className="font-bold text-gray-900 border-b pb-1 mb-1">
                      Detail Resep (v{activeVersion.versionNumber})
                    </div>
                    <ul className="space-y-0.5 text-gray-700">
                      {ingredients.map((ing, idx) => (
                        <li
                          key={ing._id || idx}
                          className="flex justify-between gap-4"
                        >
                          <span className="truncate">
                            • {ing.material?.name || 'Bahan'}
                          </span>
                          <span className="font-mono font-bold text-gray-900 flex-shrink-0">
                            {ing.qty} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-[10px] text-gray-400 font-medium select-none">
                  Belum ada bahan baku
                </span>
              )}
            </div>
          );
        }

        const draftVersion = versions.find((v) => v.status === 'draft');
        if (draftVersion) {
          const ingredients = draftVersion.ingredients || [];
          const summaryText = ingredients
            .map((ing) => ing.material?.name || 'Bahan')
            .slice(0, 3)
            .join(', ');
          const hasMore = ingredients.length > 3;
          const totalCount = ingredients.length;

          return (
            <div className="flex flex-col gap-1 py-0.5 max-w-[200px]">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="w-max bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0 rounded-sm select-none"
                >
                  v{draftVersion.versionNumber} (Draft)
                </Badge>
                <span className="text-[9px] text-gray-400 font-mono select-none">
                  out: {draftVersion.expectedOutput} {product.outputUnit}
                </span>
              </div>
              {ingredients.length > 0 ? (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="text-[10px] text-gray-500 font-medium truncate cursor-pointer hover:text-indigo-600 transition-colors">
                      {summaryText}
                      {hasMore && ` +${totalCount - 3} lainnya`}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-[10px] py-2 px-3 max-w-[250px]"
                  >
                    <div className="font-bold text-gray-900 border-b pb-1 mb-1">
                      Detail Resep (v{draftVersion.versionNumber})
                    </div>
                    <ul className="space-y-0.5 text-gray-700">
                      {ingredients.map((ing, idx) => (
                        <li
                          key={ing._id || idx}
                          className="flex justify-between gap-4"
                        >
                          <span className="truncate">
                            • {ing.material?.name || 'Bahan'}
                          </span>
                          <span className="font-mono font-bold text-gray-900 flex-shrink-0">
                            {ing.qty} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-[10px] text-gray-400 font-medium select-none">
                  Belum ada bahan baku
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="py-0.5">
            <Badge
              variant="outline"
              className="text-gray-500 text-[9px] font-bold px-1.5 py-0 rounded-sm select-none"
            >
              Unconfigured
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'Catatan',
      accessorKey: 'description',
      cell: (info: any) => (
        <div
          className="flex items-center py-0 max-w-[180px] truncate"
          title={info.getValue() || ''}
        >
          <span className="text-[11px] text-gray-500 font-medium leading-normal">
            {info.getValue() || '-'}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (info: any) => (
        <div className="flex items-center py-0">
          <ActiveStatusBadge isActive={info.getValue()} />
        </div>
      )
    },
    {
      header: 'History',
      id: 'updateHistory',
      cell: (info: any) => {
        const item = info.row.original as RTUProduct;
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
        const item = info.row.original as RTUProduct;

        if (isDeletedMode) {
          return (
            <div className="flex flex-row items-center justify-center gap-2 py-0">
              <Button
                variant="outline"
                className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border-blue-200"
                onClick={() => handleRestore(item)}
                icon={RotateCcw}
              >
                Pulihkan
              </Button>
              <Button
                variant="destructive"
                className="h-6 px-2 text-white bg-red-600 hover:bg-red-700 transition-colors"
                onClick={() => handleHardDelete(item)}
                icon={Trash2}
              >
                Hapus Permanen
              </Button>
            </div>
          );
        }

        return (
          <div className="flex flex-row items-center justify-center gap-1 py-0">
            <Link href={`/rtu/recipe/${item._id}`}>
              <Button
                size="sm"
                variant="outline"
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center gap-1 font-bold h-6 px-2 py-0 text-[10px]"
                icon={BookOpen}
              >
                Recipe
              </Button>
            </Link>
            <EditProductDialog product={item} />
            <DeleteProductButton product={item} />
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
