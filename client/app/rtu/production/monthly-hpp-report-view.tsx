'use client';

import { useState, useRef, useMemo } from 'react';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import { useProductHppReport } from '@/lib/hooks/useProductHppReport';
import { ExtendedColumnDef, TableData } from '@/components/ui/table-data';
import { CountCard } from '@/components/ui/count-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductMonthlyHppSummary } from '@/lib/type/rtu_product_hpp_report';
import { ProductHppDetailDialog } from './product-hpp-detail-dialog';
import { MonthlyHppPrintSheet } from './monthly-hpp-print-sheet';
import { toIDR } from '@/lib/utils';
import { exportProductHppReportToExcel } from '@/lib/utils/excel-export';
import { formatIndoNumber, formatCompactIDR } from '@/lib/number';
import dayjs from 'dayjs';
import {
  TrendingUp,
  Package,
  Printer,
  Download,
  Eye,
  BarChart2
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

interface MonthlyHppReportViewProps {
  batches: RTUProductionBatch[];
  isLoading: boolean;
  selectedMonth: string; // YYYY-MM
  selectedOutletName?: string;
}

export function MonthlyHppReportView({
  batches,
  isLoading,
  selectedMonth,
  selectedOutletName = 'Semua Cabang'
}: MonthlyHppReportViewProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedProduct, setSelectedProduct] =
    useState<ProductMonthlyHppSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const { productSummaries, stats } = useProductHppReport(batches);

  const formattedMonth = useMemo(() => {
    return dayjs(`${selectedMonth}-01`).format('MMMM YYYY');
  }, [selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportProductHppReportToExcel(
      productSummaries,
      stats,
      selectedMonth,
      selectedOutletName
    );
  };

  const handleOpenDetail = (prod: ProductMonthlyHppSummary) => {
    setSelectedProduct(prod);
    setDetailOpen(true);
  };

  // Table Columns Definition
  const columns = useMemo<ExtendedColumnDef<ProductMonthlyHppSummary>[]>(() => {
    return [
      {
        accessorKey: 'productCode',
        header: 'Kode',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-700 font-mono text-xs">
            {row.original.productCode}
          </span>
        )
      },
      {
        accessorKey: 'productName',
        header: 'Nama Produk',
        cell: ({ row }) => (
          <div>
            <p className="font-bold text-slate-900 leading-tight">
              {row.original.productName}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {row.original.categoryName}
            </p>
          </div>
        )
      },
      {
        accessorKey: 'totalActualQty',
        header: () => <div className="text-right">Output Qty</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium text-slate-800">
            {formatIndoNumber(row.original.totalActualQty)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">
              {row.original.unitName}
            </span>
          </div>
        )
      },
      {
        accessorKey: 'totalMaterialCost',
        header: () => <div className="text-right">Biaya Material</div>,
        cell: ({ row }) => (
          <div className="text-right text-slate-600">
            {toIDR(row.original.totalMaterialCost)}
          </div>
        )
      },
      {
        accessorKey: 'totalLaborCost',
        header: () => <div className="text-right">Biaya Labor</div>,
        cell: ({ row }) => (
          <div className="text-right text-slate-600">
            {toIDR(row.original.totalLaborCost)}
          </div>
        )
      },
      {
        accessorKey: 'totalOverheadCost',
        header: () => <div className="text-right">Biaya Overhead</div>,
        cell: ({ row }) => (
          <div className="text-right text-slate-600">
            {toIDR(row.original.totalOverheadCost)}
          </div>
        )
      },
      {
        accessorKey: 'totalCost',
        header: () => <div className="text-right">Total HPP</div>,
        cell: ({ row }) => (
          <div className="text-right font-extrabold text-slate-900">
            {toIDR(row.original.totalCost)}
          </div>
        )
      },
      {
        accessorKey: 'avgUnitCost',
        header: () => <div className="text-right">Rata-rata HPP / Unit</div>,
        cell: ({ row }) => (
          <div className="text-right font-black text-orange-700 bg-orange-50/40 px-2 py-1 rounded-sm">
            {toIDR(row.original.avgUnitCost)}
          </div>
        )
      },
      {
        accessorKey: 'contributionPercent',
        header: () => <div className="text-right">% Kontribusi</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-slate-700">
            {row.original.contributionPercent.toFixed(1)}%
          </div>
        )
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Aksi</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDetail(row.original)}
              className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 rounded-sm"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" /> Detail
            </Button>
          </div>
        )
      }
    ];
  }, []);

  return (
    <div className="space-y-4 w-full">
      {/* Printable Sheet (Only visible when printing) */}
      <div className="hidden print:block">
        <MonthlyHppPrintSheet
          ref={printRef}
          productSummaries={productSummaries}
          stats={stats}
          selectedMonth={selectedMonth}
          outletName={selectedOutletName}
        />
      </div>

      {/* Top Section: Metrics Cards & Recharts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Total HPP */}
        <CountCard
          compact={true}
          title={`Total HPP (${formattedMonth})`}
          value={formatCompactIDR(stats.grandTotalCost)}
          subValue={`${stats.totalBatchesCount} Batch`}
          description={`Material: ${stats.materialPercent.toFixed(1)}% | Labor: ${stats.laborPercent.toFixed(1)}%`}
          icon={TrendingUp}
          iconClassName="text-emerald-600 bg-emerald-50"
        />

        {/* Card 2: Total Output Qty */}
        <CountCard
          compact={true}
          title="Total Output Produksi"
          value={formatIndoNumber(stats.grandTotalQty)}
          subValue="Unit Produk"
          description={`${stats.totalProductsCount} Jenis Produk Dihasilkan`}
          icon={Package}
          iconClassName="text-indigo-600 bg-indigo-50"
        />

        {/* Card 3: Recharts Donut Structure */}
        <Card className="shadow-sm border border-gray-100 rounded-sm bg-white p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Struktur Biaya Produksi
            </p>
            <span className="text-[10px] font-semibold text-slate-600">
              100% Total
            </span>
          </div>

          {stats.costStructureBreakdown.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-[72px] w-[72px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={stats.costStructureBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={34}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.costStructureBreakdown.map((item, idx) => (
                        <Cell key={`cell-${idx}`} fill={item.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [toIDR(val), 'Nilai']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '11px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-0.5 max-h-[76px] overflow-y-auto pr-1 flex-1 text-[10px] leading-tight">
                {stats.costStructureBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-slate-600 py-0.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 mr-1">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 shrink-0">
                      Rp {formatCompactIDR(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[72px] flex items-center justify-center text-xs text-gray-400">
              Belum ada data biaya
            </div>
          )}
        </Card>

        {/* Card 4: Top Product by Cost */}
        <Card className="shadow-sm border border-gray-100 rounded-sm bg-white p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Top Produk HPP Terbesar
            </p>
            <span className="text-[10px] font-semibold text-orange-600">
              Top {stats.topProductsByCost.length}
            </span>
          </div>

          <div className="space-y-1 max-h-[76px] overflow-y-auto pr-1 text-[11px] leading-tight mt-1">
            {stats.topProductsByCost.length > 0 ? (
              stats.topProductsByCost.map((prod, i) => (
                <div
                  key={prod.name}
                  className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0 mr-2">
                    <span className="text-[10px] font-bold text-slate-400 w-3">
                      {i + 1}.
                    </span>
                    <span className="truncate font-medium">{prod.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    Rp {formatCompactIDR(prod.cost)} (
                    {prod.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))
            ) : (
              <div className="h-[50px] flex items-center justify-center text-xs text-gray-400">
                Belum ada data produk
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action Bar: Export Buttons */}
      <div className="bg-white p-3 rounded-sm shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <BarChart2 className="w-4 h-4 text-orange-500" />
          <span>Laporan HPP Produk ({formattedMonth})</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={productSummaries.length === 0}
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-sm"
          >
            <Download className="w-4 h-4 mr-1.5 text-emerald-600" /> Export
            Excel (.xlsx)
          </Button>

          <Button
            onClick={handlePrint}
            disabled={productSummaries.length === 0}
            size="sm"
            className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-sm"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-300" /> Cetak PDF
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="no-print">
        <TableData
          data={productSummaries}
          columns={columns}
          isLoading={isLoading}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
        />
      </div>

      {/* Detail Drill-down Modal */}
      <ProductHppDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        productSummary={selectedProduct}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
