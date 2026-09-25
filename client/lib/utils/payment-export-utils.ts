import dayjs from 'dayjs';
import 'dayjs/locale/id';
import * as XLSX from 'xlsx-js-style';

dayjs.locale('id');

export interface InvoiceDetailExport {
  invoiceDate: string;
  paymentDate: string;
  nominal: number;
  keterangan: string;
}

export interface VendorExportGroup {
  vendorName: string;
  accountInfo: string;
  phone: string;
  remark: string;
  totalPaid: number;
  invoices: InvoiceDetailExport[];
}

export interface OutletExportGroup {
  buyerName: string;
  vendors: VendorExportGroup[];
}

export interface DateExportGroup {
  dateKey: string; // e.g. "2026-08-18"
  dateLabel: string; // e.g. "18 Ags 2026"
  outlets: OutletExportGroup[];
}

/**
 * Formats monetary number to CSV IDR format: " Rp4.843.000,00 "
 */
export function formatIDRCsv(amount: number): string {
  if (amount === undefined || amount === null) return ' Rp0,00 ';
  const formatted = Math.abs(amount).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const prefix = amount < 0 ? '-Rp' : 'Rp';
  return ` ${prefix}${formatted} `;
}

/**
 * Group raw payments data into Date -> Outlet -> Vendor hierarchy
 */
export function groupPaymentsForExport(
  payments: any[],
  filterOpts?: {
    singleDate?: string;
    month?: string;
    buyerOutletId?: string;
  }
): DateExportGroup[] {
  const filtered = (payments || []).filter((p) => {
    if (p.status === 'CANCELLED') return false;
    const pDate = p.paymentDate || p.createdAt;
    if (!pDate) return false;

    const dateFormatted = pDate.substring(0, 10);

    if (filterOpts?.singleDate && dateFormatted !== filterOpts.singleDate) {
      return false;
    }

    if (filterOpts?.month && !pDate.startsWith(filterOpts.month)) {
      return false;
    }

    if (filterOpts?.buyerOutletId && filterOpts.buyerOutletId !== 'all') {
      const pBuyerId = p.buyerId || p.buyer?._id;
      if (pBuyerId && pBuyerId !== filterOpts.buyerOutletId) {
        return false;
      }
    }

    return true;
  });

  // Date -> BuyerOutlet -> Vendor -> Payments map
  const dateMap: Record<string, Record<string, Record<string, any>>> = {};

  filtered.forEach((p) => {
    const rawDate = p.paymentDate || p.createdAt;
    const dateKey = rawDate.substring(0, 10);

    const buyerName = (
      p.buyer?.label ||
      p.buyer?.name ||
      p.buyerOutlet?.label ||
      p.buyerOutlet?.name ||
      'KHALID'
    ).toUpperCase();

    const vendorName = (
      p.vendor?.label ||
      p.vendor?.name ||
      p.seller?.label ||
      p.seller?.name ||
      'VENDOR'
    ).toUpperCase();

    // Bank Account Info
    const payAccNo = String(p.bankAccount || p.accountNumber || '').trim();
    const matchedBankAcc =
      p.vendor?.bankAccounts?.find(
        (ba: any) =>
          ba?.accountNumber &&
          payAccNo &&
          String(ba.accountNumber).trim() === payAccNo
      ) || p.vendor?.bankAccounts?.[0];

    const accHolderName = String(
      p.accountHolder ||
        p.accountName ||
        matchedBankAcc?.accountHolder ||
        matchedBankAcc?.accountName ||
        ''
    ).trim();

    const accNo = String(
      payAccNo || matchedBankAcc?.accountNumber || ''
    ).trim();

    const bankName = String(
      p.bankName || matchedBankAcc?.bankName || 'BCA'
    ).trim();

    const accountInfoParts: string[] = [];
    if (accHolderName) accountInfoParts.push(accHolderName);
    if (accNo) accountInfoParts.push(accNo);

    const accountInfoStr =
      accountInfoParts.length > 0
        ? `${accountInfoParts.join(' ')} ( ${bankName} )`
        : `${vendorName} ( ${bankName} )`;

    const phoneStr = p.vendor?.phone || p.vendor?.contactPerson || '-';
    const remarkStr = p.notes || p.remarks || `Pelunasan ${vendorName}`;

    if (!dateMap[dateKey]) dateMap[dateKey] = {};
    if (!dateMap[dateKey][buyerName]) dateMap[dateKey][buyerName] = {};
    if (!dateMap[dateKey][buyerName][vendorName]) {
      dateMap[dateKey][buyerName][vendorName] = {
        vendorName,
        accountInfo: accountInfoStr,
        phone: phoneStr,
        remark: remarkStr,
        totalPaid: 0,
        invoices: []
      };
    }

    const vGroup = dateMap[dateKey][buyerName][vendorName];

    if (p.details && p.details.length > 0) {
      p.details.forEach((det: any) => {
        const invDateRaw =
          det.purchase?.requestDate ||
          det.invoiceDate ||
          p.paymentDate ||
          p.createdAt;
        const invDateFormatted = dayjs(invDateRaw).format('DD-MMM-YY');
        const payDateFormatted = dayjs(p.paymentDate || p.createdAt).format(
          'DD-MMM-YY'
        );
        const nominal = det.amountApplied || det.amount || 0;
        const keterangan = det.notes || p.notes || `${vendorName} ${buyerName}`;

        vGroup.invoices.push({
          invoiceDate: invDateFormatted,
          paymentDate: payDateFormatted,
          nominal,
          keterangan
        });
        vGroup.totalPaid += nominal;
      });
    } else {
      const payDateFormatted = dayjs(p.paymentDate || p.createdAt).format(
        'DD-MMM-YY'
      );
      const nominal = p.amount || 0;
      const keterangan = p.notes || `${vendorName} ${buyerName}`;

      vGroup.invoices.push({
        invoiceDate: payDateFormatted,
        paymentDate: payDateFormatted,
        nominal,
        keterangan
      });
      vGroup.totalPaid += nominal;
    }
  });

  const sortedDates = Object.keys(dateMap).sort();

  return sortedDates.map((dateKey) => {
    const dateLabel = dayjs(dateKey).format('D MMM YYYY');
    const outletsMap = dateMap[dateKey];
    const sortedBuyerNames = Object.keys(outletsMap).sort();

    const outlets: OutletExportGroup[] = sortedBuyerNames.map((buyerName) => {
      const vendorMap = outletsMap[buyerName];
      const sortedVendorNames = Object.keys(vendorMap).sort();
      const vendors: VendorExportGroup[] = sortedVendorNames.map(
        (vName) => vendorMap[vName]
      );
      return { buyerName, vendors };
    });

    return {
      dateKey,
      dateLabel,
      outlets
    };
  });
}

/**
 * Generate CSV string matching Template Tagihan CSV format
 */
export function generatePaymentCsv(groupedData: DateExportGroup[]): string {
  const lines: string[] = [];

  groupedData.forEach((dGroup, dIdx) => {
    if (dIdx > 0) {
      lines.push(';;;;;;;;;;;;;;;;;;;;;;;;;;;;');
      lines.push(';;;;;;;;;;;;;;;;;;;;;;;;;;;;');
    }

    dGroup.outlets.forEach((outlet, oIdx) => {
      if (oIdx > 0) {
        lines.push(';;;;;;;;;;;;;;;;;;;;;;;;;;;;');
        lines.push(';;;;;;;;;;;;;;;;;;;;;;;;;;;;');
      }

      // Outlet Header: Col A = TAGIHAN MINGGUAN, Col B = ( <CABANG> )
      lines.push(
        `TAGIHAN MINGGUAN; ( ${outlet.buyerName} );;;;;;;;;;;;;;;;;;;;;;;;;;;`
      );

      // Table Header Row (directly below without empty line)
      lines.push(
        'NAMA SUPLIER ;REKENING;TANGGAL INVOICE ;TANGGAL PEMBAYARAN; NOMINAL ; KETERANGAN; NO HP; REMARK;TOTAL BAYAR;;;;;;;;;;;;;;;;;;;;'
      );

      // Vendor Rows
      outlet.vendors.forEach((v) => {
        v.invoices.forEach((inv, invIdx) => {
          if (invIdx === 0) {
            // First line of vendor block
            lines.push(
              `${v.vendorName};${v.accountInfo};${inv.invoiceDate};${
                inv.paymentDate
              };${formatIDRCsv(inv.nominal)}; ${inv.keterangan}; ${v.phone}; ${
                v.remark
              };${formatIDRCsv(v.totalPaid)};;;;;;;;;;;;;;;;;;;;`
            );
          } else {
            // Subsequent invoice line
            lines.push(
              `;;${inv.invoiceDate};;${formatIDRCsv(
                inv.nominal
              )};;;;;;;;;;;;;;;;;;;;;;;;`
            );
          }
        });

        // Blank separator line after vendor block
        lines.push(';;;;;;;;;;;;;;;;;;;;;;;;;;;;');
      });
    });
  });

  return lines.join('\n');
}

/**
 * Export grouped payments to Multi-Sheet XLSX workbook
 */
export function generatePaymentXlsx(
  groupedData: DateExportGroup[],
  fileName = 'Rekap_Tagihan_Pembayaran.xlsx'
) {
  const wb = XLSX.utils.book_new();

  if (groupedData.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tidak ada data pembayaran terpilih']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran');
    XLSX.writeFile(wb, fileName);
    return;
  }

  groupedData.forEach((dGroup) => {
    const sheetData: any[][] = [];

    dGroup.outlets.forEach((outlet, oIdx) => {
      if (oIdx > 0) {
        sheetData.push([]);
      }

      // Header Cabang: Col A = TAGIHAN MINGGUAN, Col B = ( <CABANG> )
      sheetData.push(['TAGIHAN MINGGUAN', `( ${outlet.buyerName} )`]);
      // Note: No empty row pushed here so table header is directly on the next line!

      // Header Kolom
      sheetData.push([
        'NAMA SUPLIER',
        'REKENING',
        'TANGGAL INVOICE',
        'TANGGAL PEMBAYARAN',
        'NOMINAL',
        'KETERANGAN',
        'NO HP',
        'REMARK',
        'TOTAL BAYAR'
      ]);

      // Vendor Blocks
      outlet.vendors.forEach((v) => {
        v.invoices.forEach((inv, invIdx) => {
          if (invIdx === 0) {
            sheetData.push([
              v.vendorName,
              v.accountInfo,
              inv.invoiceDate,
              inv.paymentDate,
              inv.nominal,
              inv.keterangan,
              v.phone,
              v.remark,
              v.totalPaid
            ]);
          } else {
            sheetData.push([
              '',
              '',
              inv.invoiceDate,
              '',
              inv.nominal,
              '',
              '',
              '',
              ''
            ]);
          }
        });
        // Blank row separator
        sheetData.push([]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // UI/UX Pro Max Styling Palette for Excel XLSX (Sky Blue theme)
    const titleFill = { patternType: 'solid', fgColor: { rgb: '2E75B6' } }; // Biru Langit Utama (Steel Sky Blue)
    const titleFont = {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: 'FFFFFF' }
    }; // White bold text

    const headerFill = { patternType: 'solid', fgColor: { rgb: 'D9E1F2' } }; // Soft Ice Sky Blue fill
    const headerFont = {
      name: 'Calibri',
      sz: 10,
      bold: true,
      color: { rgb: '002060' }
    }; // Navy Dark Blue bold text

    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'B4C6E7' } },
      bottom: { style: 'thin', color: { rgb: 'B4C6E7' } },
      left: { style: 'thin', color: { rgb: 'B4C6E7' } },
      right: { style: 'thin', color: { rgb: 'B4C6E7' } }
    };

    const idrFormat = '"Rp "#,##0';

    // Find all row indices that contain the title banner "TAGIHAN MINGGUAN"
    const titleRowIndices = new Set<number>();
    Object.keys(ws).forEach((cellRef) => {
      if (cellRef.startsWith('!')) return;
      const cell = ws[cellRef];
      if (cell.v === 'TAGIHAN MINGGUAN') {
        const decoded = XLSX.utils.decode_cell(cellRef);
        titleRowIndices.add(decoded.r);
      }
    });

    Object.keys(ws).forEach((cellRef) => {
      if (cellRef.startsWith('!')) return;
      const cell = ws[cellRef];
      const decoded = XLSX.utils.decode_cell(cellRef);
      const cellVal = cell.v;

      // 1. Title Banner row: Col A = "TAGIHAN MINGGUAN", Col B = "( <CABANG> )"
      if (titleRowIndices.has(decoded.r)) {
        cell.s = {
          fill: titleFill,
          font: titleFont,
          alignment: { vertical: 'center', horizontal: 'left' }
        };
        return;
      }

      // 2. Table Header Row: "NAMA SUPLIER", "REKENING", "NOMINAL", etc.
      const isHeaderCell =
        typeof cellVal === 'string' &&
        [
          'NAMA SUPLIER',
          'REKENING',
          'TANGGAL INVOICE',
          'TANGGAL PEMBAYARAN',
          'NOMINAL',
          'KETERANGAN',
          'NO HP',
          'REMARK',
          'TOTAL BAYAR'
        ].includes(cellVal.trim());

      if (isHeaderCell) {
        cell.s = {
          fill: headerFill,
          font: headerFont,
          border: thinBorder,
          alignment: {
            vertical: 'center',
            horizontal:
              decoded.c === 4 || decoded.c === 8
                ? 'right'
                : decoded.c === 2 || decoded.c === 3
                  ? 'center'
                  : 'left'
          }
        };
        return;
      }

      // 3. Currency number formatting for NOMINAL (col E / idx 4) & TOTAL BAYAR (col I / idx 8)
      if ((decoded.c === 4 || decoded.c === 8) && typeof cellVal === 'number') {
        cell.z = idrFormat;
        cell.s = {
          font: { name: 'Calibri', sz: 10, bold: decoded.c === 8 },
          alignment: { vertical: 'center', horizontal: 'right' }
        };
      }
    });

    // Calculate dynamic auto-fit compact column widths based on actual text length
    const maxCols = 9;
    const computedWidths = Array(maxCols).fill(12); // minimum width 12

    sheetData.forEach((row) => {
      // Ignore title header row ("TAGIHAN MINGGUAN") from inflating column widths
      if (row[0] === 'TAGIHAN MINGGUAN') {
        return;
      }

      row.forEach((cellVal, colIdx) => {
        if (colIdx >= maxCols || cellVal === undefined || cellVal === null)
          return;

        let textLen = 0;
        if (typeof cellVal === 'number') {
          // Format numeric values (Nominal & Total Bayar) with IDR mask length (e.g. "Rp 1.000.000")
          textLen = formatIDRCsv(cellVal).trim().length;
        } else {
          textLen = String(cellVal).trim().length;
        }

        if (textLen > 0) {
          // Add 3 padding characters for clean compact layout
          const targetWidth = Math.max(12, textLen + 3);
          if (targetWidth > computedWidths[colIdx]) {
            computedWidths[colIdx] = targetWidth;
          }
        }
      });
    });

    ws['!cols'] = computedWidths.map((w) => ({ wch: w }));

    // Sanitize sheet name (max 31 chars, no invalid chars)
    let sheetName = dGroup.dateLabel.replace(/[\/\\\?\*\[\]]/g, '');
    if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, fileName);
}
