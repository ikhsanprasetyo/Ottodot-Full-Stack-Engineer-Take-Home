'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, XCircle, Printer } from 'lucide-react';
import { toIDR } from '@/lib/utils';
import { useCancelRTUPayment } from '@/lib/hooks/queries/rtu-payment';
import { RTURelatedDocs } from '@/components/shared/related-docs';
import { DialogBase } from '@/components/ui/dialog-base';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';
import { ReusableSummaryCard } from '@/components/ui/reusable-summary-card';
import { PrintHeader } from '@/components/print/print-header';
import { PrintFooter } from '@/components/print/print-footer';

interface PaymentDetailsDialogProps {
  payment: any;
  customTrigger?: React.ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export function PaymentDetailsDialog({
  payment,
  customTrigger,
  defaultOpen = false,
  onClose
}: PaymentDetailsDialogProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen, payment?._id]);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const cancelMutation = useCancelRTUPayment();

  const summaryItems = React.useMemo(
    () => [
      {
        label: 'Total Pembayaran',
        value: toIDR(payment.amount),
        isHighlight: true,
        className: 'text-white',
        valueClassName: 'text-white text-xs font-bold'
      }
    ],
    [payment.amount]
  );

  const handleCancel = async () => {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 6) {
      setReasonError('Alasan pembatalan wajib diisi minimal 6 karakter');
      return;
    }
    setReasonError('');
    try {
      await cancelMutation.mutateAsync({ id: payment._id, reason: trimmed });
      setShowConfirmCancel(false);
      setOpen(false);
      setCancelReason('');
    } catch {
      // handled by mutation toast
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) onClose?.();
      }}
    >
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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 rounded-sm border-none shadow-2xl text-gray-900 overflow-hidden">
        {/* PROFESSIONAL PRINT SECTION */}
        <div className="print-only">
          <PrintHeader
            title="BUKTI PEMBAYARAN (PAYMENT)"
            docNumber={payment.docNumber}
            dateLabel="Tanggal Bayar"
            dateValue={payment.paymentDate}
          />

          <div className="grid grid-cols-2 gap-12 mb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Penerima / Vendor:
              </p>
              <p className="text-sm font-bold">
                {payment.vendor?.name || payment.seller?.name || 'Manual'}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Metode Pembayaran:
              </p>
              <p className="text-sm font-bold uppercase">
                {payment.method || 'CASH'}
                {payment.bankName
                  ? ` (${payment.bankName} - ${payment.bankAccount || '-'})`
                  : ''}
              </p>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th className="text-left">Keterangan / Dokumen</th>
                <th className="text-right">Nominal Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold">
                  Pembayaran Tagihan Dokumen #{payment.docNumber}
                </td>
                <td className="text-right font-bold">
                  {toIDR(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 border-2 border-black p-4 italic text-sm">
            <p className="text-[10px] font-semibold uppercase mb-1">Catatan:</p>
            {payment.notes || 'Tidak ada catatan tambahan.'}
          </div>

          <PrintFooter className="mt-8" />
        </div>

        {/* SCREEN SECTION (Hidden on Print) */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex-shrink-0 no-print">
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Rincian Pembayaran
                </DialogTitle>
                {getStatusBadge(payment.status)}
              </div>
              <p className="text-xs font-mono font-bold text-indigo-600">
                {payment.docNumber}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs font-bold border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
              title="Cetak Bukti Pembayaran"
              icon={Printer}
            >
              Cetak Pembayaran
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          {/* GRID INFO UTAMA */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-sm border border-gray-100">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Tanggal Pembayaran
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {formatDate(payment.paymentDate)}
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Tujuan / Penerima
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {payment.vendor?.name || payment.seller?.name || 'Manual'}
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Nominal Pembayaran
                </label>
                <span className="text-sm font-bold text-indigo-700 font-mono">
                  {toIDR(payment.amount)}
                  {payment.taxPercent > 0 && (
                    <span className="text-[10px] text-gray-500 font-normal font-sans ml-1.5">
                      (Termasuk PPN {payment.taxPercent}%)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Metode Pembayaran
                </label>
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {payment.method || 'CASH'}
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Bank / No. Rekening
                </label>
                <span className="text-xs font-bold text-gray-800">
                  {payment.bankName ? (
                    <>
                      {payment.bankName} - {payment.bankAccount || '-'}
                    </>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block">
                  Catatan / Notes
                </label>
                <span className="text-xs text-gray-700 italic block max-w-xs break-words">
                  {payment.notes || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* DOKUMEN TERKAIT (PO, GRN, INVOICE) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Dokumen Terkait
            </h3>
            {!payment.details || payment.details.length === 0 ? (
              <div className="text-center p-4 border border-dashed border-gray-200 rounded-sm text-gray-500 text-xs">
                Tidak ada dokumen PO / Invoice yang terhubung
              </div>
            ) : (
              <div className="space-y-3">
                {payment.details.map((detail: any) => (
                  <PaymentRelatedDocsCard
                    key={detail._id}
                    detail={detail}
                    paymentId={payment._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Totals Bar */}
        <ReusableSummaryCard items={summaryItems} />

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="rounded-sm text-xs font-bold px-4"
          >
            Tutup
          </Button>
          {(payment.status === 'DRAFT' || payment.status === 'COMPLETED') && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-bold border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
              title="Batalkan"
              icon={XCircle}
              onClick={() => setShowConfirmCancel(true)}
            >
              Batalkan
            </Button>
          )}
        </div>
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
        title="Batalkan Pembayaran"
        description="Apakah Anda yakin ingin membatalkan transaksi pembayaran ini?"
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
              Ya, Batalkan Pembayaran
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Apakah Anda yakin ingin membatalkan transaksi pembayaran{' '}
            <strong className="text-gray-900 font-mono">
              {payment.docNumber}
            </strong>
            ?
          </p>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-700 mb-1 block">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <FormInput
              placeholder="Contoh: Typo salah input nominal pembayaran..."
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

function PaymentRelatedDocsCard({
  detail,
  paymentId
}: {
  detail: any;
  paymentId?: string;
}) {
  return (
    <RTURelatedDocs purchaseId={detail.purchaseId} excludeDocId={paymentId} />
  );
}
