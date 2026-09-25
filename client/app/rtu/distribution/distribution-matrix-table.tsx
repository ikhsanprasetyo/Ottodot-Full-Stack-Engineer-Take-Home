'use client';

import { useMemo } from 'react';
import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { ExtendedColumnDef, TableData } from '@/components/ui/table-data';
import { formatIndoNumber } from '@/lib/number';
import dayjs from 'dayjs';
import { sortArrayByPath } from '@/lib/sort-array-by-path';
import { useState } from 'react';
import { DistributionDailyDetailsDialog } from './distribution-daily-details-dialog';

interface DistributionMatrixTableProps {
  distributions: RTUDistribution[];
  isLoading: boolean;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  selectedMonth: string; // YYYY-MM
}

export function DistributionMatrixTable({
  distributions,
  isLoading,
  globalFilter,
  setGlobalFilter,
  selectedMonth
}: DistributionMatrixTableProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    productName: string;
    date: string;
    distributions: RTUDistribution[];
  } | null>(null);

  const totalDays = useMemo(() => {
    return dayjs(`${selectedMonth}-01`).daysInMonth();
  }, [selectedMonth]);

  // Group items by item code/name and destination
  const groupedItems = useMemo(() => {
    const map = new Map<string, any>();

    distributions.forEach((dist) => {
      if (dist.status === 'CANCELLED') return;
      if (dist.isDeleted) return;

      const dateStr = dist.shipmentDate || dist.createdAt;
      const day = dayjs(dateStr).date();
      const destName = dist.outlet?.label || dist.outlet?.name || '-';
      const destId = dist.outlet?._id || 'unknown';

      dist.items?.forEach((item) => {
        let pName = '-';
        let pCode = '-';
        const itemType = dist.type === 'PRODUCT' ? 'Produk' : 'Material';

        if (dist.type === 'PRODUCT' && item.product) {
          pName = item.product.name;
          pCode = item.product.code;
        } else if (dist.type === 'MATERIAL' && item.material) {
          pName = item.material.brand
            ? `${item.material.name} (${item.material.brand})`
            : item.material.name;
          pCode = item.material.code;
        }

        if (!pCode || pCode === '-') return;

        const key = `${itemType}_${pCode}_${destId}`;

        if (!map.has(key)) {
          map.set(key, {
            name: pName,
            code: pCode,
            destId,
            itemType,
            destName,
            dailyQty: {},
            dailyDistributions: {}
          });
        }

        const existing = map.get(key);
        existing.dailyQty[day] =
          (existing.dailyQty[day] || 0) + (item.qty || 0);

        if (!existing.dailyDistributions[day]) {
          existing.dailyDistributions[day] = [];
        }
        existing.dailyDistributions[day].push(dist);
      });
    });

    return Array.from(map.values());
  }, [distributions]);

  const sortedGroupedItems = useMemo(() => {
    return sortArrayByPath(groupedItems, 'code', 'asc');
  }, [groupedItems]);

  // Add group headers and subtotals
  const itemsWithGroupHeaders = useMemo(() => {
    const result: any[] = [];
    let currentType = '';
    let counter = 0;
    let headerCount = 0;

    sortedGroupedItems.forEach((item) => {
      if (item.itemType !== currentType) {
        currentType = item.itemType;
        headerCount++;
        result.push({
          isGroupHeader: true,
          itemType: currentType,
          id: `header-${currentType}-${headerCount}`
        });
      }
      counter++;
      result.push({
        ...item,
        rowIndex: counter,
        id: `row-${item.itemType}-${item.code}-${item.destId}-${counter}`
      });
    });
    return result;
  }, [sortedGroupedItems]);

  // Calculate Subtotals per Group
  const groupDailyTotals = useMemo(() => {
    const result: Record<string, Record<number, number>> = {};

    sortedGroupedItems.forEach((item) => {
      if (item.isGroupHeader) return;
      const iType = item.itemType || '';
      if (!result[iType]) result[iType] = {};

      Object.entries(item.dailyQty ?? {}).forEach(([dayStr, qty]) => {
        const day = Number(dayStr);
        result[iType][day] =
          (result[iType][day] ?? 0) + (typeof qty === 'number' ? qty : 0);
      });
    });
    return result;
  }, [sortedGroupedItems]);

  const enrichedData = useMemo(() => {
    const result: any[] = [];
    for (let i = 0; i < itemsWithGroupHeaders.length; i++) {
      const item = itemsWithGroupHeaders[i];
      result.push(item);

      const next = itemsWithGroupHeaders[i + 1];
      if (!item.isGroupHeader && (!next || next.isGroupHeader)) {
        const iType = item.itemType || '';
        const totals = groupDailyTotals[iType] ?? {};
        const groupTotal = Object.values(totals).reduce(
          (s: number, v) => s + (v as number),
          0
        );

        result.push({
          isGroupSubtotal: true,
          itemType: iType,
          groupDailyTotals: totals,
          groupTotal,
          id: `subtotal-${iType}`
        });
      }
    }
    return result;
  }, [itemsWithGroupHeaders, groupDailyTotals]);

  // Daily grand totals for footer
  const dailyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    sortedGroupedItems.forEach((prod) => {
      Object.entries(prod.dailyQty ?? {}).forEach(([dayStr, qty]) => {
        const day = Number(dayStr);
        totals[day] = (totals[day] ?? 0) + (typeof qty === 'number' ? qty : 0);
      });
    });
    return totals;
  }, [sortedGroupedItems]);

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
          if (row.original.isGroupHeader) {
            return (
              <span className="font-bold text-[12px] text-emerald-800 uppercase tracking-wider">
                {row.original.itemType}
              </span>
            );
          }
          if (row.original.isGroupSubtotal) {
            return (
              <span className="text-blue-700 font-semibold text-[11px] uppercase">
                SUBTOTAL {row.original.itemType}
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
        accessorKey: 'destName',
        header: 'Cabang Tujuan',
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
            <span className="text-gray-600 font-medium text-xs capitalize">
              {row.original.destName}
            </span>
          );
        }
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
                  <span className="text-[11px] font-semibold text-blue-600">
                    {formatIndoNumber(
                      row.original.groupDailyTotals?.[day] ?? 0
                    )}
                  </span>
                </div>
              );
            }
            if (row.original.isGroupHeader) return null;

            const qty = row.original.dailyQty?.[day] ?? 0;
            const distsArr = row.original.dailyDistributions?.[day] || [];

            if (qty === 0)
              return <span className="text-gray-300 text-[11px]">-</span>;

            return (
              <div
                className="relative group flex items-center justify-end h-full w-full px-1 min-h-[24px] rounded-sm hover:bg-gray-100 transition-colors border border-transparent cursor-pointer"
                onClick={() => {
                  setSelectedDetails({
                    productName: row.original.name,
                    date: `${selectedMonth}-${day.toString().padStart(2, '0')}`,
                    distributions: distsArr
                  });
                  setDetailsOpen(true);
                }}
              >
                <span className="whitespace-nowrap text-[11px] font-medium text-gray-700 group-hover:text-gray-900">
                  {formatIndoNumber(qty)}
                </span>

                <div className="absolute z-[60] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                  <div className="flex flex-col items-center gap-1 bg-gray-800 text-white rounded-sm shadow-xl p-1.5 min-w-[90px]">
                    <span className="text-[9px] font-semibold uppercase whitespace-nowrap">
                      {distsArr.length} Pengiriman
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
            TOTAL QTY
          </div>
        ),
        size: 80,
        align: 'right',
        sticky: 'right',
        right: 0,
        borderLeft: true,
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.isGroupSubtotal) {
            return (
              <div className="ml-auto w-max pr-2">
                <span className="whitespace-nowrap text-[11px] font-semibold text-blue-600">
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
        noDataMessage="Tidak ada data distribusi ditemukan pada bulan ini."
        footerRow={
          <tr className="bg-blue-50 text-gray-900 font-bold shadow-sm">
            <td
              colSpan={4}
              className="px-4 py-3 text-[11px] sticky left-0 z-20 bg-blue-50 whitespace-nowrap uppercase text-right"
            >
              TOTAL QTY HARIAN
            </td>
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const val = dailyTotals[day] || 0;
              return (
                <td
                  key={`footer-${day}`}
                  className="px-2 py-3 text-right text-[11px] whitespace-nowrap bg-blue-50"
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
              className="px-2 py-3 text-[12px] whitespace-nowrap sticky right-0 z-20 bg-blue-50 text-gray-900"
              style={{ minWidth: 80 }}
            >
              <div className="ml-auto w-max pr-2 font-bold">
                <span>{formatIndoNumber(grandTotal)}</span>
              </div>
            </td>
          </tr>
        }
      />

      {selectedDetails && (
        <DistributionDailyDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          productName={selectedDetails.productName}
          date={selectedDetails.date}
          distributions={selectedDetails.distributions}
        />
      )}
    </div>
  );
}
