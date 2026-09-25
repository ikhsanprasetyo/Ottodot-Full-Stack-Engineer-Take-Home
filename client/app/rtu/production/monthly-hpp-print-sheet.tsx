'use client';

import { forwardRef } from 'react';
import {
  ProductMonthlyHppSummary,
  MonthlyHppReportStats
} from '@/lib/type/rtu_product_hpp_report';
import { formatIndoNumber } from '@/lib/number';
import dayjs from 'dayjs';

interface MonthlyHppPrintSheetProps {
  productSummaries: ProductMonthlyHppSummary[];
  stats: MonthlyHppReportStats;
  selectedMonth: string; // YYYY-MM
  outletName: string;
}

export const MonthlyHppPrintSheet = forwardRef<
  HTMLDivElement,
  MonthlyHppPrintSheetProps
>(({ productSummaries, stats, selectedMonth, outletName }, ref) => {
  const formattedMonth = dayjs(`${selectedMonth}-01`).format('MMMM YYYY');
  const printedAt = dayjs().format('DD MMMM YYYY HH:mm');

  // Aggregate all material usages across products for the print sheet
  const globalMaterialMap = new Map<
    string,
    { code: string; name: string; unit: string; qty: number; cost: number }
  >();

  productSummaries.forEach((p) => {
    p.materialBreakdown.forEach((m) => {
      if (!globalMaterialMap.has(m.materialId)) {
        globalMaterialMap.set(m.materialId, {
          code: m.materialCode,
          name: m.materialName,
          unit: m.unit,
          qty: 0,
          cost: 0
        });
      }
      const existing = globalMaterialMap.get(m.materialId)!;
      existing.qty += m.totalQty;
      existing.cost += m.totalCost;
    });
  });

  const globalMaterials = Array.from(globalMaterialMap.values()).sort(
    (a, b) => b.cost - a.cost
  );

  return (
    <div
      ref={ref}
      className="p-8 bg-white text-slate-900 font-sans print:p-0 print:text-black"
    >
      {/* Print Stylesheet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
          }
        `
        }}
      />

      {/* Company Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">
            SINAR UTAMA MIE AYAM SETIAP HARI
          </h1>
          <p className="text-xs text-slate-600">
            Laporan Rincian Biaya Produksi & Total HPP Bulanan per Produk
          </p>
        </div>
        <div className="text-right text-xs text-slate-700 space-y-0.5">
          <p>
            <span className="font-bold">Cabang/Outlet:</span>{' '}
            {outletName || 'Semua Cabang'}
          </p>
          <p>
            <span className="font-bold">Periode:</span> {formattedMonth}
          </p>
          <p className="text-[10px] text-slate-500">Dicetak: {printedAt}</p>
        </div>
      </div>

      {/* Executive Summary Grid */}
      <div className="grid grid-cols-4 gap-3 mb-5 text-xs">
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <p className="text-[10px] font-bold text-slate-500 uppercase">
            Total HPP Produksi
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Rp {formatIndoNumber(stats.grandTotalCost)}
          </p>
          <p className="text-[9px] text-slate-500">
            {stats.totalBatchesCount} Batch Produksi
          </p>
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <p className="text-[10px] font-bold text-slate-500 uppercase">
            Biaya Material (Bahan)
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Rp {formatIndoNumber(stats.grandTotalMaterialCost)}
          </p>
          <p className="text-[9px] text-slate-500">
            Rasio: {stats.materialPercent.toFixed(1)}%
          </p>
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <p className="text-[10px] font-bold text-slate-500 uppercase">
            Biaya Tenaga Kerja (Labor)
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Rp {formatIndoNumber(stats.grandTotalLaborCost)}
          </p>
          <p className="text-[9px] text-slate-500">
            Rasio: {stats.laborPercent.toFixed(1)}%
          </p>
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50">
          <p className="text-[10px] font-bold text-slate-500 uppercase">
            Biaya Operasional (Overhead)
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Rp {formatIndoNumber(stats.grandTotalOverheadCost)}
          </p>
          <p className="text-[9px] text-slate-500">
            Rasio: {stats.overheadPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Section 1: HPP per Product Table */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-l-4 border-orange-500 pl-2">
          1. Ringkasan HPP & Hasil Produksi per Produk
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
            <tr>
              <th className="p-2 border-r border-slate-300 text-center w-8">
                No
              </th>
              <th className="p-2 border-r border-slate-300">Kode</th>
              <th className="p-2 border-r border-slate-300">Nama Produk</th>
              <th className="p-2 border-r border-slate-300 text-right">
                Output Qty
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Material
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Labor
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Overhead
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Total HPP (Rp)
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Rata-rata HPP/Unit
              </th>
              <th className="p-2 text-right w-16">% Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {productSummaries.map((p, idx) => (
              <tr key={p.productId} className="even:bg-slate-50">
                <td className="p-1.5 border-r border-slate-300 text-center text-slate-600">
                  {idx + 1}
                </td>
                <td className="p-1.5 border-r border-slate-300 font-semibold">
                  {p.productCode}
                </td>
                <td className="p-1.5 border-r border-slate-300 font-bold">
                  {p.productName}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right">
                  {formatIndoNumber(p.totalActualQty)} {p.unitName}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right">
                  Rp {formatIndoNumber(p.totalMaterialCost)}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right">
                  Rp {formatIndoNumber(p.totalLaborCost)}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right">
                  Rp {formatIndoNumber(p.totalOverheadCost)}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right font-bold text-slate-900">
                  Rp {formatIndoNumber(p.totalCost)}
                </td>
                <td className="p-1.5 border-r border-slate-300 text-right font-extrabold text-orange-900">
                  Rp {formatIndoNumber(p.avgUnitCost)}
                </td>
                <td className="p-1.5 text-right font-semibold">
                  {p.contributionPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
            <tr>
              <td
                colSpan={3}
                className="p-2 border-r border-slate-300 text-center"
              >
                TOTAL HPP BULANAN
              </td>
              <td className="p-2 border-r border-slate-300 text-right">-</td>
              <td className="p-2 border-r border-slate-300 text-right">
                Rp {formatIndoNumber(stats.grandTotalMaterialCost)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right">
                Rp {formatIndoNumber(stats.grandTotalLaborCost)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right">
                Rp {formatIndoNumber(stats.grandTotalOverheadCost)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right text-slate-950">
                Rp {formatIndoNumber(stats.grandTotalCost)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right">-</td>
              <td className="p-2 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Section 2: Global Material Usage Breakdown */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-l-4 border-blue-500 pl-2">
          2. Rekapitulasi Penggunaan Bahan Baku Terpakai
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
            <tr>
              <th className="p-2 border-r border-slate-300 text-center w-8">
                No
              </th>
              <th className="p-2 border-r border-slate-300">Kode Material</th>
              <th className="p-2 border-r border-slate-300">Nama Bahan Baku</th>
              <th className="p-2 border-r border-slate-300 text-right">
                Total Qty Terpakai
              </th>
              <th className="p-2 border-r border-slate-300 text-right">
                Rata-rata Harga Unit
              </th>
              <th className="p-2 text-right">Total Biaya FIFO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {globalMaterials.map((m, idx) => {
              const avgPrice = m.qty > 0 ? m.cost / m.qty : 0;
              return (
                <tr key={m.code || idx} className="even:bg-slate-50">
                  <td className="p-1.5 border-r border-slate-300 text-center text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 font-semibold">
                    {m.code}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 font-bold">
                    {m.name}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 text-right">
                    {formatIndoNumber(m.qty)} {m.unit}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 text-right">
                    Rp {formatIndoNumber(avgPrice)} / {m.unit}
                  </td>
                  <td className="p-1.5 text-right font-bold text-slate-900">
                    Rp {formatIndoNumber(m.cost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-400">
            <tr>
              <td
                colSpan={5}
                className="p-2 border-r border-slate-300 text-center"
              >
                TOTAL KONSUMSI BIAYA MATERIAL
              </td>
              <td className="p-2 text-right">
                Rp {formatIndoNumber(stats.grandTotalMaterialCost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

MonthlyHppPrintSheet.displayName = 'MonthlyHppPrintSheet';
