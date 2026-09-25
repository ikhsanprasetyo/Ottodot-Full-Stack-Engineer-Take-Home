'use client';

import { useState, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUVendor } from '@/lib/type/rtu_vendor';
import { ActiveStatusBadge } from '@/components/ui/active-status-badge';
import { EditVendorButton } from './edit-vendor-button';
import { DeleteVendorButton } from './delete-vendor-button';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import {
  logoMap,
  getSvgString,
  getBankSlug
} from '@/components/ui/bank-accounts';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';
import { BadgeCheck, RotateCcw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  useRestoreRTUVendor,
  useHardDeleteRTUVendor
} from '@/lib/hooks/mutation/rtu-vendor';

interface RTUVendorTableProps {
  dataArray: RTUVendor[];
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading: boolean;
  isDeletedMode?: boolean;
}

export function RTUVendorTable({
  dataArray,
  globalFilter,
  setGlobalFilter,
  isLoading,
  isDeletedMode = false
}: RTUVendorTableProps) {
  const queryClient = useQueryClient();
  const { mutate: restoreVendor } = useRestoreRTUVendor();
  const { mutate: hardDeleteVendor } = useHardDeleteRTUVendor();

  const handleRestore = useCallback(
    (item: RTUVendor) => {
      if (
        confirm(`Apakah Anda yakin ingin memulihkan Vendor "${item.name}"?`)
      ) {
        restoreVendor(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Vendor berhasil dipulihkan!');
            queryClient.invalidateQueries({ queryKey: ['rtu-vendors'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal memulihkan vendor'
            );
          }
        });
      }
    },
    [restoreVendor, queryClient]
  );

  const handleHardDelete = useCallback(
    (item: RTUVendor) => {
      if (
        confirm(
          `Apakah Anda yakin ingin MENGHAPUS PERMANEN Vendor "${item.name}"? Tindakan ini tidak dapat dibatalkan.`
        )
      ) {
        hardDeleteVendor(item._id, {
          onSuccess: (res) => {
            toast.success(res?.message || 'Vendor berhasil dihapus permanen!');
            queryClient.invalidateQueries({ queryKey: ['rtu-vendors'] });
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || 'Gagal menghapus permanen'
            );
          }
        });
      }
    },
    [hardDeleteVendor, queryClient]
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false }
  ]);

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
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-bold text-[11px] text-gray-800">
            {info.getValue()}
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
      header: 'City',
      id: 'city',
      cell: (info: any) => {
        const v = info.row.original;
        const mainBranch = v.branches?.[0];
        const city = mainBranch?.city || v.city || '-';
        const totalBranches = v.branches?.length || 1;

        const googleMapsUrl = mainBranch?.googleMapsUrl || v.googleMapsUrl;
        const latitude = mainBranch?.latitude || v.latitude;
        const longitude = mainBranch?.longitude || v.longitude;

        let mapLink = googleMapsUrl;
        if (!mapLink && latitude && longitude) {
          mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        }

        return (
          <div className="flex items-center justify-between gap-2 py-0">
            <span className="text-[11px] text-gray-600">
              {city}{' '}
              {totalBranches > 1 && (
                <span className="ml-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded-sm">
                  +{totalBranches - 1} cabang
                </span>
              )}
            </span>
            {mapLink && (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:bg-slate-100 p-0.5 rounded-sm transition-colors flex-shrink-0 flex items-center justify-center h-5 w-5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/google-maps-classic.svg"
                      alt="Google Maps"
                      className="h-3.5 w-3.5"
                      style={{ objectFit: 'contain' }}
                    />
                  </a>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="text-[10px] font-bold py-1 px-2"
                >
                  Buka di Google Maps
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      header: 'Province',
      id: 'province',
      cell: (info: any) => {
        const v = info.row.original;
        const province = v.branches?.[0]?.province || v.province || '-';
        return (
          <div className="py-0">
            <span className="text-[11px] text-gray-600">{province}</span>
          </div>
        );
      }
    },
    {
      header: 'Rekening Bank',
      accessorKey: 'bankAccounts',
      cell: (info: any) => {
        const accounts = info.getValue() as any[];
        if (!accounts || accounts.length === 0) {
          return <span className="text-[11px] text-gray-400">-</span>;
        }
        return (
          <div className="flex flex-col gap-1 py-0">
            {accounts.map((acc, idx) => {
              const slug = getBankSlug(acc.bankName);
              const rawLogo = slug ? logoMap[slug] : null;
              const svgString = getSvgString(rawLogo);
              return (
                <div
                  key={idx}
                  className="text-[10px] text-gray-700 leading-normal border-b border-gray-50 last:border-0 pb-1 last:pb-0 flex items-center flex-wrap gap-x-1.5"
                >
                  {svgString ? (
                    <div
                      className="flex items-center justify-center bg-white border border-gray-200/80 p-0.5 rounded-sm h-5 w-8 flex-shrink-0 [&>svg]:h-2.5 [&>svg]:w-auto [&>svg]:max-w-full shadow-sm"
                      dangerouslySetInnerHTML={{ __html: svgString }}
                    />
                  ) : (
                    <div className="flex items-center justify-center bg-gray-100 border border-gray-200 p-0.5 rounded-sm h-5 w-8 flex-shrink-0 text-[7px] font-semibold text-gray-700 uppercase tracking-tighter">
                      {acc.bankName ? acc.bankName.slice(0, 4) : 'BANK'}
                    </div>
                  )}
                  <span className="font-bold">{acc.bankName}</span>
                  {acc.isDefault && (
                    <Tooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <BadgeCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10 flex-shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="text-[10px] font-bold py-1 px-2"
                      >
                        Rekening Utama
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className="text-gray-400">•</span>
                  <span className="font-mono">{acc.accountNumber}</span>
                  <span className="text-gray-500 uppercase">
                    ({acc.accountHolder})
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'Term (Days)',
      accessorKey: 'paymentTermDays',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-mono text-[11px] font-bold text-gray-800">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Catatan',
      accessorKey: 'notes',
      cell: (info: any) => (
        <div
          className="py-0 max-w-[180px] truncate"
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
        <div className="py-0">
          <ActiveStatusBadge isActive={info.getValue()} />
        </div>
      )
    },
    {
      header: 'History',
      id: 'updateHistory',
      cell: (info: any) => {
        const item = info.row.original as RTUVendor;
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
            <EditVendorButton vendor={item} />
            <DeleteVendorButton vendor={item} />
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
