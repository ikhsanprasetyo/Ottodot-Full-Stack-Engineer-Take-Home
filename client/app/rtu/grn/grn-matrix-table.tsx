'use client';

import { useMemo, useState } from 'react';
import { RTUGRN } from '@/lib/type/rtu_grn';
import { ExtendedColumnDef, TableData } from '@/components/ui/table-data';
import { formatIndoNumber } from '@/lib/number';
import dayjs from 'dayjs';
import { sortArrayByPath } from '@/lib/sort-array-by-path';
import { GRNDailyDetailsDialog } from './grn-daily-details-dialog';

interface GRNMatrixTableProps {
  grns: RTUGRN[];
  isLoading: boolean;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  selectedMonth: string; // YYYY-MM
  statusFilter?: string;
}

export function GRNMatrixTable({
  grns,
  isLoading,
  globalFilter,
  setGlobalFilter,
  selectedMonth,
  statusFilter
}: GRNMatrixTableProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    productName: string;
    date: string;
    grns: RTUGRN[];
  } | null>(null);

  const totalDays = useMemo(() => {
    return dayjs(`${selectedMonth}-01`).daysInMonth();
  }, [selectedMonth]);

  // Group items by code
  const groupedProducts = useMemo(() => {
    const map = new Map<string, any>();

    grns.forEach((grn) => {
      // Exclude CANCELLED from matrix totals if "Semua Status" is selected
      if (
        (!statusFilter || statusFilter === 'ALL') &&
        grn.status === 'CANCELLED'
      ) {
        return;
      }
      const dateStr = grn.receiptDate || grn.createdAt;
      const day = dayjs(dateStr).date();

      const sourceName = grn.vendor?.name || 'Manual Inbound';

      const destName =
        grn.outlet?.label || grn.outlet?.name || 'Central Kitchen';
      const destId = grn.outlet?._id || 'central';

      (grn.items || []).forEach((item) => {
        const isMaterial = !!item.material;
        const pName = isMaterial ? item.material?.name : item.product?.name;
        const pCode = isMaterial ? item.material?.code : item.product?.code;
        const unit = item.unit || '-';
        const typeLabel = isMaterial ? 'Bahan Baku' : 'Produk Jadi';

        if (!pCode) return;

        // Group by product and destination
        const key = `${pCode}_${destId}`;

        if (!map.has(key)) {
          map.set(key, {
            name: pName,
            code: pCode,
            productType: typeLabel,
            unit,
            sourceNames: new Set<string>(),
            destName,
            dailyQty: {},
            dailyGrns: {}
          });
        }

        const existing = map.get(key);
        existing.sourceNames.add(sourceName);
        existing.dailyQty[day] =
          (existing.dailyQty[day] || 0) + (item.qtyReceived || 0);

        if (!existing.dailyGrns[day]) {
          existing.dailyGrns[day] = [];
        }
        existing.dailyGrns[day].push(grn);
      });
    });

    return Array.from(map.values());
  }, [grns, statusFilter]);

  const sortedGroupedProducts = useMemo(() => {
    return sortArrayByPath(groupedProducts, 'code', 'asc');
  }, [groupedProducts]);

  // Add group headers and subtotals
  const productsWithGroupHeaders = useMemo(() => {
    const result: any[] = [];
    let currentType = '';
    let counter = 0;

    sortedGroupedProducts.forEach((prod) => {
      if (prod.productType !== currentType) {
        currentType = prod.productType;
        result.push({
          isGroupHeader: true,
          productType: currentType
        });
      }
      counter++;
      result.push({
        ...prod,
        rowIndex: counter
      });
    });
    return result;
  }, [sortedGroupedProducts]);

  // Calculate Subtotals per Group
  const groupDailyTotals = useMemo(() => {
    const result: Record<string, Record<number, number>> = {};

    sortedGroupedProducts.forEach((item) => {
      if (item.isGroupHeader) return;
      const pType = item.productType || '';
      if (!result[pType]) result[pType] = {};

      Object.entries(item.dailyQty ?? {}).forEach(([dayStr, qty]) => {
        const day = Number(dayStr);
        result[pType][day] =
          (result[pType][day] ?? 0) + (typeof qty === 'number' ? qty : 0);
      });
    });
    return result;
  }, [sortedGroupedProducts]);

  const enrichedData = useMemo(() => {
    const result: any[] = [];
    for (let i = 0; i < productsWithGroupHeaders.length; i++) {
      const item = productsWithGroupHeaders[i];
      result.push(item);

      const next = productsWithGroupHeaders[i + 1];
      if (!item.isGroupHeader && (!next || next.isGroupHeader)) {
        const pType = item.productType || '';
        const totals = groupDailyTotals[pType] ?? {};
        const groupTotal = Object.values(totals).reduce(
          (s: number, v) => s + (v as number),
          0
        );

        result.push({
          isGroupSubtotal: true,
          productType: pType,
          groupDailyTotals: totals,
          groupTotal
        });
      }
    }
    return result;
  }, [productsWithGroupHeaders, groupDailyTotals]);

  // Daily grand totals for footer
  const dailyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    sortedGroupedProducts.forEach((prod) => {
      Object.entries(prod.dailyQty ?? {}).forEach(([dayStr, qty]) => {
        const day = Number(dayStr);
        totals[day] = (totals[day] ?? 0) + (typeof qty === 'number' ? qty : 0);
      });
    });
    return totals;
  }, [sortedGroupedProducts]);

  const grandTotal = useMemo(
    () => Object.values(dailyTotals).reduce((s, v) => s + v, 0),
    [dailyTotals]
  );

  const columns: ExtendedColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'index',
        header: '#',
        size: 30,
        minSize: 30,
        maxSize: 30,
        sticky: 'left',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-center font-medium">
            {!row.original.isGroupHeader && !row.original.isGroupSubtotal
              ? row.original.rowIndex
              : ''}
          </span>
        )
      },
      {
        accessorKey: 'code',
        header: 'Code',
        size: 80,
        minSize: 80,
        maxSize: 80,
        noWrap: true,
        sticky: 'left',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupHeader || row.original.isGroupSubtotal)
            return null;
          return (
            <span className="text-gray-800">{row.original.code || '-'}</span>
          );
        }
      },
      {
        accessorKey: 'name',
        header: 'Item',
        size: 180,
        minSize: 180,
        maxSize: 180,
        sticky: 'left',
        noWrap: true,
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupHeader) return null;
          if (row.original.isGroupSubtotal) {
            return (
              <span className="text-emerald-700 font-semibold text-[11px] uppercase">
                SUBTOTAL {row.original.productType}
              </span>
            );
          }
          return (
            <span className="text-gray-900 font-medium">
              {row.original.name || '-'}
            </span>
          );
        }
      },
      {
        accessorKey: 'sourceNames',
        header: 'Asal Barang',
        size: 140,
        minSize: 140,
        maxSize: 140,
        noWrap: false,
        sticky: 'left',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupHeader || row.original.isGroupSubtotal)
            return null;
          const sources = Array.from(row.original.sourceNames || []).join(', ');
          return (
            <span
              className="text-gray-600 font-medium text-[10px] leading-tight line-clamp-2"
              title={sources}
            >
              {sources}
            </span>
          );
        }
      },
      {
        accessorKey: 'destName',
        header: 'Cabang Penerima',
        size: 140,
        minSize: 140,
        maxSize: 140,
        noWrap: true,
        sticky: 'left',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupHeader || row.original.isGroupSubtotal)
            return null;
          return (
            <span className="text-gray-600 font-medium text-xs">
              {row.original.destName}
            </span>
          );
        }
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        size: 50,
        align: 'center',
        enableSorting: false
      },
      ...Array.from({ length: totalDays }, (_, i): ExtendedColumnDef<any> => {
        const day = i + 1;
        return {
          id: `day-${day}`,
          accessorFn: (row) => row.dailyQty?.[day] || 0,
          align: 'right',
          size: 45,
          enableSorting: false,
          header: () => (
            <div className="font-bold text-xs text-center w-full">{day}</div>
          ),
          cell: ({ row }) => {
            if (row.original.isGroupSubtotal) {
              return (
                <div className="flex items-center justify-end h-full w-full px-1">
                  <span className="text-[11px] font-semibold text-emerald-600">
                    {formatIndoNumber(
                      row.original.groupDailyTotals?.[day] ?? 0
                    )}
                  </span>
                </div>
              );
            }
            if (row.original.isGroupHeader) return null;

            const qty = row.original.dailyQty?.[day] ?? 0;
            const grnsArr = row.original.dailyGrns?.[day] || [];

            if (qty === 0)
              return <span className="text-gray-300 text-[11px]">-</span>;

            return (
              <div
                className="relative group flex items-center justify-end h-full w-full px-1 min-h-[24px] rounded-sm hover:bg-gray-100 transition-colors cursor-pointer border border-transparent"
                onClick={() => {
                  setSelectedDetails({
                    productName: row.original.name,
                    date: `${selectedMonth}-${day.toString().padStart(2, '0')}`,
                    grns: grnsArr
                  });
                  setDetailsOpen(true);
                }}
              >
                <span className="whitespace-nowrap text-[11px] font-medium text-gray-700 group-hover:text-gray-900">
                  {formatIndoNumber(qty)}
                </span>

                <div className="absolute z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                  <div className="flex flex-col items-center gap-1 bg-gray-800 text-white rounded-sm shadow-xl p-1.5 min-w-[70px]">
                    <span className="text-[9px] font-semibold uppercase whitespace-nowrap">
                      {grnsArr.length} Transaksi
                    </span>
                  </div>
                </div>
              </div>
            );
          }
        };
      }),
      {
        id: 'total',
        header: () => (
          <div className="ml-auto w-max pr-1 font-bold text-xs tracking-wide">
            TOTAL
          </div>
        ),
        size: 70,
        align: 'right',
        sticky: 'right',
        right: 0,
        borderLeft: true,
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupSubtotal) {
            return (
              <div className="ml-auto w-max pr-2">
                <span className="whitespace-nowrap text-[11px] font-semibold text-emerald-600">
                  {formatIndoNumber(row.original.groupTotal ?? 0)}
                </span>
              </div>
            );
          }
          if (row.original.isGroupHeader) return null;

          const total = Object.values(row.original.dailyQty ?? {}).reduce(
            (sum: number, qty) => sum + (typeof qty === 'number' ? qty : 0),
            0
          );

          return (
            <div className="ml-auto w-max pr-2">
              <span className="whitespace-nowrap text-[11px] font-semibold text-gray-800">
                {formatIndoNumber(total)}
              </span>
            </div>
          );
        }
      }
    ],
    [totalDays, selectedMonth]
  );

  return (
    <div className="overflow-x-auto rounded-sm border border-gray-100 shadow-sm">
      <TableData
        data={enrichedData}
        columns={columns as any}
        isLoading={isLoading}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        noDataMessage="Tidak ada data GRN ditemukan pada bulan ini."
        footerRow={
          <tr className="bg-emerald-50 text-gray-900 font-bold shadow-sm">
            <td
              colSpan={5}
              className="px-4 py-3 text-[11px] sticky left-0 z-20 bg-emerald-50 whitespace-nowrap uppercase text-right"
            >
              TOTAL HARIAN
            </td>
            <td className="px-2 py-3 text-[10px] bg-emerald-50"></td>
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const val = dailyTotals[day] || 0;
              return (
                <td
                  key={`footer-${day}`}
                  className="px-2 py-3 text-right text-[11px] whitespace-nowrap bg-emerald-50"
                >
                  <div className="flex items-center justify-end h-full">
                    <span className="mr-1 text-gray-900">
                      {formatIndoNumber(val)}
                    </span>
                  </div>
                </td>
              );
            })}
            <td
              className="px-2 py-3 text-[12px] whitespace-nowrap sticky right-0 z-20 bg-emerald-50 text-gray-900"
              style={{ minWidth: 70 }}
            >
              <div className="ml-auto w-max pr-2 font-bold">
                <span>{formatIndoNumber(grandTotal)}</span>
              </div>
            </td>
          </tr>
        }
      />

      {selectedDetails && (
        <GRNDailyDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          productName={selectedDetails.productName}
          date={selectedDetails.date}
          grns={selectedDetails.grns}
        />
      )}
    </div>
  );
}
