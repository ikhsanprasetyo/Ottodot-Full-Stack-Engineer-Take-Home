import * as XLSX from 'xlsx-js-style';

/**
 * Global Enterprise Best Practice Excel Export Utility
 * Support styling, headers, and simple data structures.
 */
export const exportToExcel = (
  data: any[],
  fileName: string,
  sheetName: string = 'Data'
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // Basic Styling for Header
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F81BD' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportProductHppReportToExcel = (
  productSummaries: any[],
  stats: any,
  selectedMonth: string,
  outletName: string
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan HPP Produk
  const sheet1Data = productSummaries.map((p, idx) => ({
    No: idx + 1,
    'Kode Produk': p.productCode,
    'Nama Produk': p.productName,
    Kategori: p.categoryName,
    'Total Output Qty': p.totalActualQty,
    Satuan: p.unitName,
    'Biaya Material (Rp)': p.totalMaterialCost,
    'Biaya Labor (Rp)': p.totalLaborCost,
    'Biaya Overhead (Rp)': p.totalOverheadCost,
    'Total HPP (Rp)': p.totalCost,
    'Rata-rata HPP/Unit (Rp)': p.avgUnitCost,
    'Kontribusi (%)': Number(p.contributionPercent.toFixed(2))
  }));

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const range1 = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
  for (let C = range1.s.c; C <= range1.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (ws1[address]) {
      ws1[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { horizontal: 'center' }
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'HPP per Produk');

  // Sheet 2: Ringkasan Bahan Baku
  const globalMaterialMap = new Map<string, any>();
  productSummaries.forEach((p) => {
    p.materialBreakdown.forEach((m: any) => {
      if (!globalMaterialMap.has(m.materialId)) {
        globalMaterialMap.set(m.materialId, {
          code: m.materialCode,
          name: m.materialName,
          unit: m.unit,
          qty: 0,
          cost: 0
        });
      }
      const existing = globalMaterialMap.get(m.materialId);
      existing.qty += m.totalQty;
      existing.cost += m.totalCost;
    });
  });

  const sheet2Data = Array.from(globalMaterialMap.values()).map((m, idx) => ({
    No: idx + 1,
    'Kode Material': m.code,
    'Nama Bahan Baku': m.name,
    'Total Qty Terpakai': m.qty,
    Satuan: m.unit,
    'Rata-rata Harga Unit (Rp)': m.qty > 0 ? m.cost / m.qty : 0,
    'Total Biaya FIFO (Rp)': m.cost
  }));

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const range2 = XLSX.utils.decode_range(ws2['!ref'] || 'A1');
  for (let C = range2.s.c; C <= range2.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (ws2[address]) {
      ws2[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center' }
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Konsumsi Bahan Baku');

  const fileName = `Laporan_HPP_Produksi_${selectedMonth}_${(outletName || 'Cabang').replace(/\s+/g, '_')}`;
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
