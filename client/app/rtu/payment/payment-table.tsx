'use client';

import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';
import {
  useGetRTUPayments,
  useCompleteRTUPayment
} from '@/lib/hooks/queries/rtu-payment';
import { toIDR } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');
import { Badge } from '@/components/ui/badge';
import { PaymentDetailsDialog } from './payment-details-dialog';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  getBankSlug,
  logoMap,
  getSvgString
} from '@/components/ui/bank-accounts';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';

interface PaymentTableProps {
  buyerId?: string;
  targetId?: string;
  targetType?: 'VENDOR' | 'SELLER' | 'ALL';
  selectedMonth?: string;
}

export function PaymentTable({
  buyerId,
  targetId,
  targetType,
  selectedMonth
}: PaymentTableProps) {
  const { data: payments, isLoading } = useGetRTUPayments({
    buyerId,
    vendorId: targetType === 'VENDOR' ? targetId : undefined,
    sellerId: targetType === 'SELLER' ? targetId : undefined
  });
  const completeMutation = useCompleteRTUPayment();

  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const filteredData = useMemo(() => {
    const list = payments?.data || [];
    if (!selectedMonth) return list;
    return list.filter((p: any) => {
      if (!p.paymentDate) return false;
      return p.paymentDate.startsWith(selectedMonth);
    });
  }, [payments, selectedMonth]);

  const handleComplete = async () => {
    if (confirmComplete) {
      await completeMutation.mutateAsync(confirmComplete);
      setConfirmComplete(null);
    }
  };

  const columns = useMemo(
    (): ExtendedColumnDef<any>[] => [
      {
        id: 'docNumber',
        accessorKey: 'docNumber',
        header: 'No. Dokumen',
        size: 150,
        noWrap: true,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="font-mono text-[11px] font-bold text-gray-700">
              {row.original.docNumber}
            </span>
          </div>
        )
      },
      {
        id: 'paymentDate',
        accessorKey: 'paymentDate',
        header: 'Tanggal Bayar',
        size: 120,
        noWrap: true,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="text-xs text-gray-600">
              {dayjs(row.original.paymentDate).format('DD MMM YYYY')}
            </span>
          </div>
        )
      },
      {
        id: 'target',
        header: 'Vendor / Outlet',
        size: 180,
        cell: ({ row }) => {
          const p = row.original;
          if (p.vendor) {
            return (
              <div className="flex flex-col justify-center py-1 min-h-[20px]">
                <span className="font-bold text-xs text-gray-800">
                  {p.vendor.name}
                </span>
                <div className="text-[10px] text-gray-500">Vendor External</div>
              </div>
            );
          }
          if (p.seller) {
            return (
              <div className="flex flex-col justify-center py-1 min-h-[20px]">
                <span className="font-bold text-xs text-gray-800">
                  {p.seller.name}
                </span>
                <div className="text-[10px] text-gray-500">Internal Outlet</div>
              </div>
            );
          }
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <span className="text-xs text-gray-400">-</span>
            </div>
          );
        }
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Nominal',
        size: 140,
        align: 'right',
        cell: ({ row }) => (
          <div className="flex items-center justify-end py-1 min-h-[20px]">
            <span className="text-xs font-bold text-gray-800">
              {toIDR(row.original.amount)}
            </span>
          </div>
        )
      },
      {
        id: 'method',
        accessorKey: 'method',
        header: 'Metode',
        size: 100,
        align: 'center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center py-1 min-h-[20px]">
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded-sm text-gray-700">
              {row.original.method}
            </span>
          </div>
        )
      },
      {
        id: 'bankName',
        header: 'Rekening Asal',
        size: 180,
        cell: ({ row }) => {
          const p = row.original;
          if (p.method !== 'TRANSFER' || !p.bankName) {
            return (
              <div className="flex items-center py-1 min-h-[20px]">
                <span className="text-xs text-gray-400">-</span>
              </div>
            );
          }
          const slug = getBankSlug(p.bankName);
          const rawLogo = slug ? logoMap[slug] : null;
          const svgString = getSvgString(rawLogo);
          const acc = p.vendor?.bankAccounts?.find(
            (a: any) => a.accountNumber === p.bankAccount
          );
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <div className="flex items-center gap-2.5">
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    {svgString ? (
                      <div
                        className="flex items-center justify-center bg-white border border-gray-200/80 p-0.5 rounded-sm h-6 w-10 flex-shrink-0 [&>svg]:h-3.5 [&>svg]:w-auto [&>svg]:max-w-full shadow-sm cursor-help"
                        dangerouslySetInnerHTML={{ __html: svgString }}
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-gray-100 border border-gray-200 p-0.5 rounded-sm h-6 w-10 flex-shrink-0 text-[8px] font-semibold text-gray-700 cursor-help uppercase tracking-tighter">
                        {p.bankName.slice(0, 4)}
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs font-semibold">{p.bankName}</p>
                  </TooltipContent>
                </Tooltip>
                <div>
                  <div className="font-mono text-gray-700 text-xs font-bold">
                    {p.bankAccount}
                  </div>
                  {acc?.accountHolder && (
                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">
                      a.n. {acc.accountHolder}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        header: 'Catatan',
        size: 160,
        cell: ({ row }) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span
              className="text-xs text-gray-500 block max-w-[160px] truncate"
              title={row.original.notes || ''}
            >
              {row.original.notes || '-'}
            </span>
          </div>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        align: 'center',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-center py-1 min-h-[20px]">
              <Badge
                variant={
                  p.status === 'COMPLETED'
                    ? 'default'
                    : p.status === 'DRAFT'
                      ? 'outline'
                      : 'destructive'
                }
                className={`rounded-sm text-[10px] px-2 py-0.5 ${
                  p.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : p.status === 'DRAFT'
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : ''
                }`}
              >
                {p.status}
              </Badge>
            </div>
          );
        }
      },
      {
        id: 'updateHistory',
        header: 'History',
        size: 160,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <UpdateHistoryCell
                histories={p.histories}
                creator={p.creator}
                updater={p.updater}
                createdAt={p.createdAt}
              />
            </div>
          );
        }
      }
    ],
    []
  );

  const renderActions = useMemo(() => {
    return function RenderPaymentActions(p: any) {
      return (
        <>
          <PaymentDetailsDialog payment={p} />
          {p.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[10px] font-bold border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
              title="Selesaikan"
              icon={CheckCircle2}
              onClick={() => setConfirmComplete(p._id)}
            >
              Sudah Ditransfer
            </Button>
          )}
        </>
      );
    };
  }, []);

  return (
    <>
      <TableData
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        hidePagination
        renderActions={renderActions}
        actionsColumnSize={180}
        noDataMessage="Belum ada transaksi pembayaran"
        tableContainerClassName="overflow-x-auto"
      />

      <ConfirmationDialog
        open={!!confirmComplete}
        onOpenChange={(v) => !v && setConfirmComplete(null)}
        title="Selesaikan Pembayaran?"
        description="Apakah Anda yakin ingin menyelesaikan pembayaran ini? Mengonfirmasi pembayaran menandakan bahwa transaksi pembayaran/transfer dana sudah selesai dilakukan. Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleComplete}
        confirmText="Selesaikan"
        isLoading={completeMutation.isPending}
        isDestructive={false}
      />
    </>
  );
}
