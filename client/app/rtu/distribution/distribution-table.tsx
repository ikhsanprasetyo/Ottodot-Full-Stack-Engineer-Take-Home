'use client';

import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { TableData } from '@/components/ui/table-data';
import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { DistributionDetailsDialog } from './distribution-details-dialog';
import { EditDistributionDialog } from './edit-distribution-dialog';
import { Button } from '@/components/ui/button';
import { XCircle, Truck, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  cancelRTUDistribution,
  useShipRTUDistribution,
  useReceiveRTUDistribution
} from '@/lib/hooks/queries/rtu-distribution';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface DistributionTableProps {
  distributions: RTUDistribution[];
  isLoading: boolean;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  selectedMonth: string; // YYYY-MM
}

export function DistributionTable({
  distributions,
  isLoading,
  globalFilter,
  setGlobalFilter
}: DistributionTableProps) {
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmShipId, setConfirmShipId] = useState<string | null>(null);
  const [confirmReceiveId, setConfirmReceiveId] = useState<string | null>(null);

  const { hasPermission: canUpdate } = useGetPermission(
    'update',
    'distribution'
  );

  const shipMutation = useShipRTUDistribution();
  const receiveMutation = useReceiveRTUDistribution();

  const handleShip = async () => {
    if (confirmShipId) {
      await shipMutation.mutateAsync(confirmShipId);
      setConfirmShipId(null);
    }
  };

  const handleReceive = async () => {
    if (confirmReceiveId) {
      await receiveMutation.mutateAsync(confirmReceiveId);
      setConfirmReceiveId(null);
    }
  };

  const { mutate: handleCancel } = useMutation({
    mutationFn: async (id: string) => {
      setCancelingId(id);
      return await cancelRTUDistribution(id);
    },
    onSuccess: () => {
      toast.success('Distribution cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['rtu-distributions'] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to cancel distribution'
      );
    },
    onSettled: () => {
      setCancelingId(null);
    }
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'shipmentDate', desc: true }
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
      accessorKey: 'shipmentDate',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="text-[11px] font-bold text-gray-800">
              {val ? dayjs(val).format('DD MMM YYYY HH:mm') : '-'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Doc Number',
      accessorKey: 'docNumber',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-mono font-bold text-[11px] text-blue-600">
            {info.getValue() || '-'}
          </span>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="font-bold text-[11px] text-gray-900">
            {info.getValue() === 'MATERIAL' ? 'Bahan Baku' : 'Produk Jadi'}
          </span>
        </div>
      )
    },
    {
      header: 'Cabang Tujuan',
      id: 'outletLabel',
      accessorFn: (row: any) => {
        if (row.vendor) {
          return `${row.vendor.name} (Vendor)`;
        }
        return row.outlet?.label || row.outlet?.name;
      },
      cell: (info: any) => (
        <div className="flex items-center py-1 min-h-[20px]">
          <span className="text-[11px] font-bold text-gray-800">
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
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <span className="text-[11px] text-gray-500">-</span>
            </div>
          );
        return (
          <div className="flex flex-col gap-1 py-1">
            {items.map((item, idx) => {
              const isMaterial = !!item.material;
              const name = isMaterial
                ? item.material?.name
                : item.product?.name || 'Unknown Item';
              const brand = isMaterial ? item.material?.brand : null;
              const sub = item.material?.code || item.product?.code || '';
              return (
                <div
                  key={idx}
                  className="flex items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                >
                  <span
                    className="font-bold text-[11px] text-gray-800 cursor-help border-b border-dashed border-gray-300"
                    title={sub}
                  >
                    {name}
                    {brand && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({brand})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'Qty',
      id: 'qty',
      align: 'right' as const,
      accessorFn: (row: RTUDistribution) => {
        return row.items.reduce((acc, curr) => acc + (curr.qty || 0), 0);
      },
      cell: (info: any) => {
        const items = info.row.original.items as any[];
        if (!items || items.length === 0)
          return (
            <div className="flex items-center justify-end py-1 min-h-[20px]">
              <span className="text-[11px] text-gray-500">-</span>
            </div>
          );
        return (
          <div className="flex flex-col gap-1 py-1">
            {items.map((item, idx) => {
              return (
                <div
                  key={idx}
                  className="flex justify-end items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                >
                  <span className="text-gray-900 whitespace-nowrap">
                    <span className="font-bold">{item.qty} </span>
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
      header: 'Status',
      accessorKey: 'status',
      align: 'center' as const,
      cell: (info: any) => {
        const status = info.getValue() as string;
        let variant: 'default' | 'destructive' | 'secondary' | 'outline' =
          'outline';

        switch (status) {
          case 'DRAFT':
            variant = 'secondary';
            break;
          case 'SHIPPED':
            variant = 'outline';
            break;
          case 'RECEIVED':
            variant = 'default';
            break;
          case 'CANCELLED':
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
      header: 'History',
      id: 'updateHistory',
      cell: (info: any) => {
        const item = info.row.original as RTUDistribution;
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
        const item = info.row.original as RTUDistribution;

        return (
          <div className="flex items-center justify-center gap-2 py-1 min-h-[20px]">
            <DistributionDetailsDialog distribution={item} />

            {canUpdate && item.status === 'DRAFT' && (
              <>
                <EditDistributionDialog distribution={item} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-bold border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Kirim Barang"
                  icon={Truck}
                  onClick={() => setConfirmShipId(item._id || (item as any).id)}
                >
                  Kirim Barang
                </Button>
              </>
            )}

            {canUpdate && item.status === 'SHIPPED' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[10px] font-bold border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
                title="Terima Barang"
                icon={CheckCircle2}
                onClick={() =>
                  setConfirmReceiveId(item._id || (item as any).id)
                }
              >
                Terima Barang
              </Button>
            )}

            {(item.status === 'SHIPPED' || item.status === 'RECEIVED') && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to cancel this distribution? This action cannot be undone.'
                    )
                  ) {
                    handleCancel(item._id || (item as any).id);
                  }
                }}
                isLoading={cancelingId === (item._id || (item as any).id)}
                className="h-7 w-7 text-red-600 border-red-200 hover:bg-red-50 cursor-pointer rounded-sm"
                title="Cancel"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full space-y-4">
      <TableData
        data={distributions}
        columns={columns}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
      />

      <ConfirmationDialog
        open={!!confirmShipId}
        onOpenChange={(v) => !v && setConfirmShipId(null)}
        title="Kirim Barang (Shipment)?"
        description="Konfirmasi bahwa barang/material siap dikirim. Stok pada outlet asal akan langsung dikurangi. Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleShip}
        confirmText="Kirim"
        isDestructive={false}
        isLoading={shipMutation.isPending}
      />

      <ConfirmationDialog
        open={!!confirmReceiveId}
        onOpenChange={(v) => !v && setConfirmReceiveId(null)}
        title="Konfirmasi Barang Diterima?"
        description="Apakah Anda yakin barang/material ini sudah sampai dan diterima di outlet tujuan? Stok pada outlet tujuan akan bertambah secara real-time."
        onConfirm={handleReceive}
        confirmText="Diterima"
        isDestructive={false}
        isLoading={receiveMutation.isPending}
      />
    </div>
  );
}
