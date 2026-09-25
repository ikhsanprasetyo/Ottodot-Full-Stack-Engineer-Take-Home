'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  FileSpreadsheet,
  FileType,
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  groupPaymentsForExport,
  generatePaymentCsv,
  generatePaymentXlsx,
  DateExportGroup
} from '@/lib/utils/payment-export-utils';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { MonthPicker } from '@/components/shared/month-picker';
import { toIDR } from '@/lib/utils';
import dayjs from 'dayjs';

interface PaymentExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: any[];
  initialMonth?: string;
  initialBuyerId?: string;
  onTriggerPrint?: (data: DateExportGroup[]) => void;
}

export function PaymentExportDialog({
  open,
  onOpenChange,
  payments = [],
  initialMonth,
  initialBuyerId,
  onTriggerPrint
}: PaymentExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf'>(
    'xlsx'
  );
  const [exportScope, setExportScope] = useState<'month' | 'single'>('month');
  const [selectedMonth, setSelectedMonth] = useState(
    () => initialMonth || dayjs().format('YYYY-MM')
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().format('YYYY-MM-DD')
  );
  const [selectedBuyerId, setSelectedBuyerId] = useState(
    () => initialBuyerId || 'all'
  );
  const [isExporting, setIsExporting] = useState(false);

  // Group data based on current dialog filters
  const groupedData = useMemo(() => {
    return groupPaymentsForExport(payments, {
      month: exportScope === 'month' ? selectedMonth : undefined,
      singleDate: exportScope === 'single' ? selectedDate : undefined,
      buyerOutletId: selectedBuyerId
    });
  }, [payments, exportScope, selectedMonth, selectedDate, selectedBuyerId]);

  // Calculate statistics for preview card
  const stats = useMemo(() => {
    let totalInvoices = 0;
    let totalAmount = 0;
    let totalVendors = 0;

    groupedData.forEach((d) => {
      d.outlets.forEach((o) => {
        totalVendors += o.vendors.length;
        o.vendors.forEach((v) => {
          totalInvoices += v.invoices.length;
          totalAmount += v.totalPaid;
        });
      });
    });

    return {
      datesCount: groupedData.length,
      vendorsCount: totalVendors,
      invoicesCount: totalInvoices,
      totalAmount
    };
  }, [groupedData]);

  const handleExport = () => {
    if (stats.invoicesCount === 0) return;

    setIsExporting(true);
    try {
      const scopeLabel =
        exportScope === 'month'
          ? dayjs(selectedMonth).format('MMMM_YYYY')
          : selectedDate;

      if (exportFormat === 'xlsx') {
        const fileName = `Rekap_Tagihan_Pembayaran_${scopeLabel}.xlsx`;
        generatePaymentXlsx(groupedData, fileName);
      } else if (exportFormat === 'csv') {
        const csvContent = generatePaymentCsv(groupedData);
        const blob = new Blob(['\uFEFF' + csvContent], {
          type: 'text/csv;charset=utf-8;'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `Rekap_Tagihan_Pembayaran_${scopeLabel}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === 'pdf') {
        if (onTriggerPrint) {
          onTriggerPrint(groupedData);
        }
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Export payment error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] rounded-sm p-6 gap-6 bg-white border border-gray-200">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            Export Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Pilih format dokumen dan periode pembayaran yang ingin diexport.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Format Selection Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Format Dokumen
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {/* XLSX Option */}
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3 rounded-sm border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  exportFormat === 'xlsx'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500 text-indigo-950'
                    : 'border-gray-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-sm bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  {exportFormat === 'xlsx' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="font-bold text-xs block">Excel (.xlsx)</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                    Multi-sheet per tanggal pembayaran
                  </span>
                </div>
              </button>

              {/* CSV Option */}
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-sm border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500 text-indigo-950'
                    : 'border-gray-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-sm bg-amber-100 text-amber-700">
                    <FileType className="w-5 h-5" />
                  </div>
                  {exportFormat === 'csv' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="font-bold text-xs block">CSV (.csv)</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                    Format titik-koma sesuai template
                  </span>
                </div>
              </button>

              {/* PDF Option */}
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3 rounded-sm border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  exportFormat === 'pdf'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500 text-indigo-950'
                    : 'border-gray-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-sm bg-rose-100 text-rose-700">
                    <FileText className="w-5 h-5" />
                  </div>
                  {exportFormat === 'pdf' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="mt-3">
                  <span className="font-bold text-xs block">PDF Cetak</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                    Layout cetak lanskap
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Selector (Month vs Single Date) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Cakupan Tanggal
              </Label>
              <div className="flex border border-gray-200 p-0.5 rounded-sm bg-slate-50">
                <button
                  type="button"
                  onClick={() => setExportScope('month')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer ${
                    exportScope === 'month'
                      ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1 Bulan Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('single')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer ${
                    exportScope === 'single'
                      ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tanggal Persis
                </button>
              </div>
            </div>

            {/* Date Picker depending on scope */}
            <div className="space-y-1.5">
              {exportScope === 'month' ? (
                <MonthPicker
                  label="Pilih Bulan"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="w-full"
                  inputClassName="w-full"
                  useLabelComponent
                />
              ) : (
                <>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Pembayaran
                  </Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 text-xs rounded-sm border-gray-200"
                  />
                </>
              )}
            </div>
          </div>

          {/* Outlet Filter */}
          <div className="space-y-1.5">
            <OutletSelector
              value={selectedBuyerId}
              onSelect={setSelectedBuyerId}
              allowAll={true}
              autoSelectFirst={false}
              className="w-full"
            />
          </div>

          {/* Live Summary Metrics */}
          <div className="bg-slate-900 text-white rounded-sm p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-indigo-400" />
                Ringkasan Output Export
              </span>
              <span className="text-[11px] bg-indigo-600/60 border border-indigo-400/40 text-indigo-100 px-2 py-0.5 rounded-sm font-semibold">
                {exportFormat === 'xlsx'
                  ? `${stats.datesCount} Sheet Tanggal`
                  : exportFormat === 'csv'
                    ? 'Format CSV'
                    : 'Dokumen Print'}
              </span>
            </div>

            {stats.invoicesCount > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Tanggal Payment
                  </span>
                  <span className="text-base font-bold text-white">
                    {stats.datesCount} Hari
                  </span>
                </div>
                <div className="border-x border-slate-800 px-2">
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Vendor / Rincian
                  </span>
                  <span className="text-base font-bold text-white">
                    {stats.vendorsCount} Vendor ({stats.invoicesCount} Inv)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Total Nominal
                  </span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5 block">
                    {toIDR(stats.totalAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-300 text-xs py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Tidak ada transaksi pembayaran pada periode / kriteria
                  terpilih.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-sm text-xs border-gray-200"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={stats.invoicesCount === 0 || isExporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-xs gap-1.5"
            icon={exportFormat === 'pdf' ? <Printer /> : <Download />}
          >
            {exportFormat === 'pdf' ? (
              <>Buka Cetak PDF</>
            ) : (
              <>Download {exportFormat.toUpperCase()}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
