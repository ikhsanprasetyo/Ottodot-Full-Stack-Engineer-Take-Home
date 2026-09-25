'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ProductMonthlyHppSummary } from '@/lib/type/rtu_product_hpp_report';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toIDR } from '@/lib/utils';
import { formatIndoNumber, formatCompactIDR } from '@/lib/number';
import dayjs from 'dayjs';
import { Factory, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductHppDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSummary: ProductMonthlyHppSummary | null;
  selectedMonth: string; // YYYY-MM
}

export function ProductHppDetailDialog({
  open,
  onOpenChange,
  productSummary,
  selectedMonth
}: ProductHppDetailDialogProps) {
  if (!productSummary) return null;

  const formattedMonth = dayjs(`${selectedMonth}-01`).format('MMMM YYYY');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6 rounded-sm bg-white border border-gray-100 shadow-xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-sm">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {productSummary.productName}
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-50 border-slate-200 text-slate-700"
                  >
                    {productSummary.productCode}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Rincian Alokasi HPP & Biaya Produksi Bulanan —{' '}
                  <span className="font-semibold text-slate-700">
                    {formattedMonth}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Header Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Output Qty
            </p>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">
              {formatIndoNumber(productSummary.totalActualQty)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {productSummary.unitName}
              </span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {productSummary.batchCount} Batch Produksi
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-sm">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Total Biaya HPP
            </p>
            <p className="text-base font-extrabold text-emerald-900 mt-0.5">
              {toIDR(productSummary.totalCost)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-1">
              Kontribusi: {productSummary.contributionPercent.toFixed(1)}%
            </p>
          </div>

          <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-sm">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              Rata-rata HPP / Unit
            </p>
            <p className="text-base font-extrabold text-orange-900 mt-0.5">
              {toIDR(productSummary.avgUnitCost)}
            </p>
            <p className="text-[10px] text-orange-600 mt-1">
              Per {productSummary.unitName}
            </p>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-sm">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Biaya Material (Bahan)
            </p>
            <p className="text-base font-extrabold text-blue-900 mt-0.5">
              {toIDR(productSummary.totalMaterialCost)}
            </p>
            <p className="text-[10px] text-blue-600 mt-1">
              Labor: {formatCompactIDR(productSummary.totalLaborCost)} |
              Overhead: {formatCompactIDR(productSummary.totalOverheadCost)}
            </p>
          </div>
        </div>

        <Tabs defaultValue="batches" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 border border-slate-200 rounded-sm h-10 p-1">
            <TabsTrigger
              value="batches"
              className="data-[state=active]:bg-white data-[state=active]:text-orange-700 font-semibold text-xs rounded-sm"
            >
              <Factory className="w-3.5 h-3.5 mr-1.5" /> List Batch Produksi (
              {productSummary.batches.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 font-semibold text-xs rounded-sm"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" /> Konsumsi Bahan Baku (
              {productSummary.materialBreakdown.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Batches */}
          <TabsContent value="batches" className="mt-4">
            <div className="border border-slate-200 rounded-sm overflow-hidden text-xs">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">No. Batch</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Output Qty</th>
                      <th className="py-2.5 px-3 text-right">Biaya Material</th>
                      <th className="py-2.5 px-3 text-right">Biaya Labor</th>
                      <th className="py-2.5 px-3 text-right">Biaya Overhead</th>
                      <th className="py-2.5 px-3 text-right">Total Cost</th>
                      <th className="py-2.5 px-3 text-right">HPP / Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productSummary.batches.map((b) => {
                      const bQty = Number(b.actualQty || 0);
                      const bMatCost = Number(b.totalMaterialCost || 0);
                      const bLaborCost = Number(b.totalLaborCost || 0);
                      const bOverheadCost = Number(b.totalOverheadCost || 0);
                      const bTotalCost = Number(b.totalCost || 0);
                      const bUnitCost = bQty > 0 ? bTotalCost / bQty : 0;
                      const dateStr = dayjs(
                        b.plannedDate || b.createdAt
                      ).format('DD/MM/YYYY');

                      return (
                        <tr
                          key={b._id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {b.batchNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {dateStr}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">
                            {formatIndoNumber(bQty)} {productSummary.unitName}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {toIDR(bMatCost)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {toIDR(bLaborCost)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {toIDR(bOverheadCost)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            {toIDR(bTotalCost)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-orange-700 bg-orange-50/30">
                            {toIDR(bUnitCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-800">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3">
                        TOTAL (1 Bulan)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatIndoNumber(productSummary.totalActualQty)}{' '}
                        {productSummary.unitName}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {toIDR(productSummary.totalMaterialCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {toIDR(productSummary.totalLaborCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {toIDR(productSummary.totalOverheadCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800">
                        {toIDR(productSummary.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-orange-800">
                        {toIDR(productSummary.avgUnitCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Material Breakdown */}
          <TabsContent value="materials" className="mt-4">
            <div className="border border-slate-200 rounded-sm overflow-hidden text-xs">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Kode Material</th>
                      <th className="py-2.5 px-3">Nama Bahan Baku</th>
                      <th className="py-2.5 px-3 text-right">
                        Total Qty Terpakai
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Rata-rata Harga Unit (FIFO)
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Total Biaya FIFO
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        % Biaya Material
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productSummary.materialBreakdown.map((m) => {
                      const matContrib =
                        productSummary.totalMaterialCost > 0
                          ? (m.totalCost / productSummary.totalMaterialCost) *
                            100
                          : 0;

                      return (
                        <tr
                          key={m.materialId}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {m.materialCode}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {m.materialName}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">
                            {formatIndoNumber(m.totalQty)} {m.unit}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {toIDR(m.avgUnitCost)} / {m.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            {toIDR(m.totalCost)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-700 bg-blue-50/30">
                            {matContrib.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-800">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3">
                        TOTAL BIAYA MATERIAL
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-900">
                        {toIDR(productSummary.totalMaterialCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-900">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
