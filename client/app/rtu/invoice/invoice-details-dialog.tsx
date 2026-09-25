'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import {
  Eye,
  Package,
  Printer,
  XOctagon,
  Calendar,
  Building2,
  Store,
  Banknote,
  StickyNote
} from 'lucide-react';

import { PrintHeader } from '@/components/print/print-header';
import { PrintFooter } from '@/components/print/print-footer';
import { DialogFooterSummary } from '@/components/ui/dialog-footer-summary';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { useCancelRTUInvoiceReconcile } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { RTURelatedDocs } from '@/components/shared/related-docs';
import { toIDR } from '@/lib/utils';
import { DialogBase } from '@/components/ui/dialog-base';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';

interface InvoiceDetailsDialogProps {
  invoice: any;
  customTrigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function InvoiceDetailsDialog({
  invoice,
  customTrigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onClose
}: InvoiceDetailsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
    if (!val) onClose?.();
  };

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const cancelMutation = useCancelRTUInvoiceReconcile();

  const { hasPermission: canCancel } = useGetPermission('delete', 'invoice');

  const summaryItems = React.useMemo(() => {
    const subtotal =
      invoice.items?.reduce(
        (sum: number, item: any) => sum + (item.subtotal || 0),
        0
      ) || 0;
    const ppnAmount = (subtotal * (invoice.taxPercent || 0)) / 100;
    const grandTotal = invoice.totalAmount;
    return [
      {
        label: 'Subtotal',
        value: subtotal
      },
      (invoice.taxPercent || 0) > 0 && {
        label: `PPN (${invoice.taxPercent}%)`,
        value: ppnAmount
      },
      (invoice.shippingFee || 0) > 0 && {
        label: 'Ongkos Kirim',
        value: invoice.shippingFee
      },
      (invoice.loadingFee || 0) > 0 && {
        label: 'Biaya Muat',
        value: invoice.loadingFee
      },
      (invoice.unloadingFee || 0) > 0 && {
        label: 'Biaya Bongkar',
        value: invoice.unloadingFee
      },
      ...(invoice.additionalCosts || []).map((c: any) => ({
        label: c.name || 'Biaya Lain',
        value: c.amount
      })),
      {
        label: 'Total Tagihan',
        value: grandTotal,
        isHighlight: true
      }
    ].filter(Boolean) as any[];
  }, [
    invoice.items,
    invoice.taxPercent,
    invoice.shippingFee,
    invoice.loadingFee,
    invoice.unloadingFee,
    invoice.additionalCosts,
    invoice.totalAmount
  ]);

  const handleCancel = async () => {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 6) {
      setReasonError('Alasan pembatalan wajib diisi minimal 6 karakter');
      return;
    }
    setReasonError('');
    try {
      await cancelMutation.mutateAsync({ id: invoice._id, reason: trimmed });
      setShowConfirmCancel(false);
      handleOpenChange(false);
      setCancelReason('');
    } catch {
      // handled by mutation toast
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-bold px-2 py-0.5"
          >
            Sukses
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-bold px-2 py-0.5"
          >
            Dibatalkan
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 text-[10px] font-bold px-2 py-0.5"
          >
            Draft
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!defaultOpen && (
        <DialogTrigger asChild>
          {customTrigger || (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-indigo-600 rounded-sm cursor-pointer"
              title="Lihat Detail"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogTrigger>
      )}
      {defaultOpen && customTrigger && (
        <DialogTrigger asChild>{customTrigger}</DialogTrigger>
      )}
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0 rounded-sm border-none shadow-2xl text-gray-900 overflow-hidden">
        {/* PROFESSIONAL PRINT SECTION */}
        <div className="print-only">
          <PrintHeader
            title="INVOICE RECONCILE (AP)"
            docNumber={invoice.invoiceNumber}
            dateLabel="Tanggal Invoice"
            dateValue={invoice.invoiceDate}
          />

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Pemasok (Vendor):
              </p>
              <p className="text-lg font-bold">
                {invoice.vendor?.name || 'Manual Inbound'}
              </p>
              <p className="text-[10px] font-bold text-gray-400">
                Tanggal: {dayjs(invoice.invoiceDate).format('DD/MM/YYYY')}
              </p>
              {invoice.purchase?.docNumber && (
                <p className="text-[10px] font-bold text-indigo-600 mt-1">
                  PO: {invoice.purchase.docNumber}
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Outlet Tujuan:
              </p>
              <p className="text-lg font-bold">
                {invoice.outlet?.label || 'Central Kitchen'}
              </p>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th className="text-left w-16">No</th>
                <th className="text-left">Nama Material / Item</th>
                <th className="text-right">Qty</th>
                <th className="text-center">Satuan</th>
                <th className="text-right">Harga Satuan</th>
                <th className="text-center">Diskon</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, idx: number) => (
                <tr key={item._id}>
                  <td>{idx + 1}</td>
                  <td className="font-bold">
                    {item.material?.name || 'Material'}
                    {item.material?.brand && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({item.material.brand})
                      </span>
                    )}
                  </td>
                  <td className="text-right">{item.qtyInvoiced}</td>
                  <td className="text-center">{item.unit}</td>
                  <td className="text-right">{toIDR(item.unitPrice)}</td>
                  <td className="text-center font-mono">
                    {item.discount || 0}%
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(item.subtotal)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-black">
                <td
                  colSpan={6}
                  className="text-right font-semibold uppercase text-[10px]"
                >
                  Subtotal
                </td>
                <td className="text-right font-semibold">
                  {toIDR(
                    invoice.items?.reduce(
                      (sum: number, item: any) => sum + (item.subtotal || 0),
                      0
                    ) || 0
                  )}
                </td>
              </tr>
              {(invoice.taxPercent || 0) > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-right font-semibold uppercase text-[10px]"
                  >
                    PPN ({invoice.taxPercent}%)
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(
                      ((invoice.items?.reduce(
                        (sum: number, item: any) => sum + (item.subtotal || 0),
                        0
                      ) || 0) *
                        (invoice.taxPercent || 0)) /
                        100
                    )}
                  </td>
                </tr>
              )}
              {(invoice.shippingFee || 0) > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-right font-semibold text-[10px]"
                  >
                    Ongkos Kirim
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(invoice.shippingFee)}
                  </td>
                </tr>
              )}
              {(invoice.loadingFee || 0) > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-right font-semibold text-[10px]"
                  >
                    Biaya Muat
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(invoice.loadingFee)}
                  </td>
                </tr>
              )}
              {(invoice.unloadingFee || 0) > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-right font-semibold text-[10px]"
                  >
                    Biaya Bongkar
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(invoice.unloadingFee)}
                  </td>
                </tr>
              )}
              {(invoice.additionalCosts || []).map((c: any, cIdx: number) => (
                <tr key={cIdx}>
                  <td
                    colSpan={6}
                    className="text-right font-semibold text-[10px]"
                  >
                    {c.name || 'Biaya Lain'}
                  </td>
                  <td className="text-right font-semibold">
                    {toIDR(c.amount)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-black">
                <td
                  colSpan={6}
                  className="text-right font-semibold uppercase text-[10px]"
                >
                  Grand Total
                </td>
                <td className="text-right font-semibold text-lg">
                  {toIDR(invoice.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 border-2 border-black p-4 italic text-sm">
            <p className="text-[10px] font-semibold uppercase mb-1">Catatan:</p>
            {invoice.notes || 'Tidak ada catatan tambahan.'}
          </div>

          <PrintFooter className="mt-8" />
        </div>

        {/* SCREEN SECTION (Hidden on Print) */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex-shrink-0 no-print">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Rincian Invoice Reconcile
                </DialogTitle>
                {getStatusBadge(invoice.status)}
                <div className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="text-[10px] text-gray-400 font-normal tracking-tight">
                  Dibuat {dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-indigo-600">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-sm font-bold h-7 text-xs border-gray-200 gap-1.5 hover:bg-gray-50 flex items-center mr-8"
                icon={Printer}
              >
                Cetak Invoice
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 no-print">
          {/* GRID INFO UTAMA */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-sm border border-gray-100">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Tanggal Invoice
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {dayjs(invoice.invoiceDate).format('DD MMMM YYYY')}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  Vendor / Supplier
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {invoice.vendor?.name || 'Manual Inbound'}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-0.5">
                  <Store className="w-3.5 h-3.5 text-emerald-500" />
                  Cabang Penerima
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {invoice.outlet?.label ||
                    invoice.outlet?.name ||
                    'Central Kitchen'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-0.5">
                  <Banknote className="w-3.5 h-3.5 text-indigo-500" />
                  Nilai Tagihan
                </label>
                <span className="text-sm font-extrabold text-indigo-700 font-mono block">
                  {toIDR(invoice.totalAmount)}
                  {invoice.taxPercent > 0 && (
                    <span className="text-[10px] text-gray-500 font-normal font-sans ml-1.5">
                      (Termasuk PPN {invoice.taxPercent}%)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-0.5">
                  <StickyNote className="w-3.5 h-3.5 text-gray-400" />
                  Catatan / Notes
                </label>
                <span className="text-xs text-gray-700 italic block max-w-xs break-words">
                  {invoice.notes || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* DOKUMEN TERKAIT (PO, GRN, PAYMENT) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Dokumen Terkait
            </h3>
            <RTURelatedDocs
              purchaseId={invoice.purchaseId}
              excludeDocId={invoice._id}
            />
          </div>

          {/* DETAIL ITEM INVOICE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Rincian Item Material
              </h3>
            </div>
            <div className="border border-gray-100 rounded-sm overflow-hidden shadow-sm">
              <Table containerClassName="h-auto" className="w-full">
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase py-3 w-[40px] text-center">
                      #
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase py-3">
                      Code
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase py-3">
                      Bahan Baku
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase text-right py-3">
                      Qty Invoiced
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase text-right py-3">
                      Harga Satuan
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase text-center py-3">
                      Diskon
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-[10px] uppercase text-right py-3">
                      Subtotal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoice.items || []).map((item: any, index: number) => (
                    <TableRow
                      key={item._id}
                      className="border-gray-50 hover:bg-indigo-50/30 transition-colors"
                    >
                      <TableCell className="font-mono text-gray-400 text-[11px] py-2.5 text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600 text-[11px]">
                        {item.material?.code || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900 text-xs">
                        {item.material?.name || 'Material'}
                        {item.material?.brand && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({item.material.brand})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-gray-900 text-xs">
                          {item.qtyInvoiced}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold ml-1">
                          {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {toIDR(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-gray-500 text-xs">
                        {item.discount || 0}%
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {toIDR(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Combined Footer: Totals + Actions */}
        <DialogFooterSummary items={summaryItems}>
          <Button
            variant="ghost"
            className="rounded-sm font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:text-white h-8 px-4 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(false);
            }}
          >
            Tutup
          </Button>
          {['DRAFT', 'CONFIRMED'].includes(invoice.status) && (
            <Button
              variant="outline"
              className="rounded-sm font-bold border-red-300 text-red-100 bg-red-500/30 hover:bg-red-500/50 hover:text-white h-8 px-4 text-xs gap-1.5"
              onClick={() => setShowConfirmCancel(true)}
              disabled={cancelMutation.isPending || !canCancel}
              icon={XOctagon}
            >
              Batalkan Invoice
            </Button>
          )}
        </DialogFooterSummary>
      </DialogContent>

      <DialogBase
        open={showConfirmCancel}
        onOpenChange={(v) => {
          setShowConfirmCancel(v);
          if (!v) {
            setCancelReason('');
            setReasonError('');
          }
        }}
        title="Batalkan Invoice Reconcile"
        description="Apakah Anda yakin ingin membatalkan invoice tagihan ini?"
        footer={
          <div className="flex w-full justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmCancel(false);
                setCancelReason('');
                setReasonError('');
              }}
              disabled={cancelMutation.isPending}
              className="text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 h-9 rounded-sm"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelMutation.isPending}
              onClick={handleCancel}
              disabled={cancelReason.trim().length < 6}
              className="h-9 font-bold rounded-sm"
            >
              Ya, Batalkan Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Apakah Anda yakin ingin membatalkan invoice tagihan{' '}
            <strong className="text-gray-900 font-mono">
              {invoice.invoiceNumber}
            </strong>
            ?
          </p>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-700 mb-1 block">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <FormInput
              placeholder="Contoh: Typo salah input nominal tagihan / retur barang..."
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (e.target.value.trim().length >= 6) {
                  setReasonError('');
                }
              }}
              error={reasonError}
            />
            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
              <span>Wajib diisi minimal 6 karakter</span>
              <span
                className={
                  cancelReason.trim().length >= 6
                    ? 'text-emerald-600 font-bold'
                    : 'text-amber-600 font-bold'
                }
              >
                {cancelReason.trim().length} / 6 karakter
              </span>
            </div>
          </div>
        </div>
      </DialogBase>
    </Dialog>
  );
}
