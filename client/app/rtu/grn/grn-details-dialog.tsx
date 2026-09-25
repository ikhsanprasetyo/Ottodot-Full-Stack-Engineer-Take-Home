'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RTUGRN } from '@/lib/type/rtu_grn';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import {
  Eye,
  XOctagon,
  Calendar,
  Package,
  Truck,
  Hash,
  Printer,
  FileText
} from 'lucide-react';
import { RTURelatedDocs } from '@/components/shared/related-docs';
import api from '@/lib/api/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PrintHeader } from '@/components/print/print-header';
import { PrintFooter } from '@/components/print/print-footer';
import React, { useState, useEffect } from 'react';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { ReusableSummaryCard } from '@/components/ui/reusable-summary-card';
import { DialogBase } from '@/components/ui/dialog-base';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';

interface GRNDetailsDialogProps {
  grn: RTUGRN;
  customTrigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function GRNDetailsDialog({
  grn,
  customTrigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onClose
}: GRNDetailsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
    if (!val) onClose?.();
  };

  useEffect(() => {
    if (defaultOpen && !isControlled) {
      setInternalOpen(true);
    }
  }, [defaultOpen, grn?._id, isControlled]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const queryClient = useQueryClient();

  const { hasPermission: canDeleteGrn } = useGetPermission('delete', 'rtu_grn');

  const summaryItems = React.useMemo(
    () => [
      {
        label: 'Jumlah Baris Item',
        value: `${(grn.items || []).length} Baris`,
        valueClassName: 'text-white'
      },
      {
        label: 'Total Qty Diterima',
        value: `${(grn.items || []).reduce((acc: number, item: any) => acc + (item.qtyReceived || 0), 0)} Unit`,
        isHighlight: true,
        className: 'text-white',
        valueClassName: 'text-white text-xs font-bold'
      }
    ],
    [grn.items]
  );

  const handleCancel = async () => {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 6) {
      setReasonError('Alasan pembatalan wajib diisi minimal 6 karakter');
      return;
    }
    setReasonError('');

    setIsProcessing(true);
    try {
      await api.post(`/rtu/grn/cancel/${grn._id}`, { reason: trimmed });
      toast.success('GRN berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['rtu-grns'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      setShowConfirmCancel(false);
      setOpen(false);
      setCancelReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membatalkan GRN');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) onClose?.();
      }}
    >
      {/* Only render trigger when not in controlled/portal mode */}
      {!defaultOpen && !isControlled && (
        <DialogTrigger asChild>
          {customTrigger || (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 rounded-sm hover:bg-blue-50 hover:text-blue-600 text-blue-600"
              icon={Eye}
            />
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
            title="GOODS RECEIPT NOTE (GRN)"
            docNumber={grn.grnNumber}
            dateLabel="Tanggal GRN"
            dateValue={grn.receiptDate}
          />

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Diterima Dari (Vendor):
              </p>
              <p className="text-xl font-bold">
                {grn.vendor?.name || 'Manual Inbound'}
              </p>
              <p className="text-[10px] font-bold text-gray-400">
                Date: {dayjs(grn.receiptDate).format('DD/MM/YYYY')}
              </p>
              {grn.purchase?.docNumber && (
                <p className="text-[10px] font-bold text-blue-600 mt-1">
                  PO: {grn.purchase.docNumber}
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                Gudang Penerima:
              </p>
              <p className="text-lg font-bold">
                {grn.outlet?.label || 'Central Kitchen'}
              </p>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th className="text-left w-16">No</th>
                <th className="text-left">Nama Material / Item</th>
                <th className="text-right">Qty Diterima</th>
                <th className="text-center">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {(grn.items || []).map((item, idx) => (
                <tr key={item._id}>
                  <td>{idx + 1}</td>
                  <td className="font-bold">
                    {item.material?.name}
                    {item.material?.brand && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({item.material.brand})
                      </span>
                    )}
                  </td>
                  <td className="text-right">{item.qtyReceived}</td>
                  <td className="text-center">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 border-2 border-black p-4 italic text-sm">
            <p className="text-[10px] font-extrabold uppercase mb-1">
              Catatan:
            </p>
            {grn.notes || 'Tidak ada catatan tambahan.'}
          </div>

          <PrintFooter className="mt-8" />
        </div>

        {/* SCREEN SECTION (Hidden on Print) */}
        <div className="no-print flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <DialogHeader className="pt-1 px-1 border-b border-gray-100 pb-3">
            <div className="flex items-start justify-between pr-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      grn.status === 'CONFIRMED'
                        ? 'default'
                        : grn.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase"
                  >
                    {grn.status}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                    Created at {dayjs(grn.createdAt).format('DD/MM/YYYY HH:mm')}
                  </span>
                </div>
                <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <Hash className="w-5 h-5 text-blue-500" />
                  {grn.grnNumber}
                </DialogTitle>
                {grn.purchase?.docNumber && (
                  <div className="pt-0.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] text-blue-600 border-blue-200 bg-blue-50"
                    >
                      PO: {grn.purchase.docNumber}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action Button Mentok Kanan Atas (Sebelum Tombol X Close) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 px-3 text-xs font-bold border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-sm gap-1.5 cursor-pointer whitespace-nowrap"
                icon={Printer}
              >
                Cetak Bukti Penerimaan
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded-sm border border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-sm shadow-sm text-blue-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Vendor
                </p>
                <p className="font-extrabold text-gray-800 text-xs truncate">
                  {grn.vendor?.name || 'Manual Inbound'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-sm border border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-sm shadow-sm text-green-600 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Receipt Date
                </p>
                <p className="font-extrabold text-gray-800 text-xs">
                  {dayjs(grn.receiptDate).format('DD MMM YYYY HH:mm')}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-sm border border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-sm shadow-sm text-gray-500 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Catatan
                </p>
                <p
                  className="font-medium text-gray-600 text-xs truncate mt-0.5"
                  title={grn.notes}
                >
                  {grn.notes || 'Tidak ada catatan tambahan.'}
                </p>
              </div>
            </div>
          </div>

          {/* DOKUMEN TERKAIT (PO, GRN, INVOICE, PAYMENT) */}
          {grn.purchaseId && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Dokumen Terkait
              </h3>
              <RTURelatedDocs
                purchaseId={grn.purchaseId}
                excludeDocId={grn._id}
              />
            </div>
          )}

          <div className="pt-2">
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <Package className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-extrabold uppercase text-gray-800 tracking-wider">
                Item Details
              </h3>
            </div>
            <div className="border border-gray-100 rounded-sm overflow-hidden shadow-sm">
              <Table containerClassName="h-auto" className="w-full">
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="font-extrabold text-gray-600 text-[11px] uppercase w-[50px] text-center">
                      #
                    </TableHead>
                    <TableHead className="font-extrabold text-gray-600 text-[11px] uppercase text-left">
                      Code
                    </TableHead>
                    <TableHead className="font-extrabold text-gray-600 text-[11px] uppercase text-left">
                      Material
                    </TableHead>
                    <TableHead className="font-extrabold text-gray-600 text-[11px] uppercase text-right">
                      Qty Received
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(grn.items || []).map((item, index) => (
                    <TableRow
                      key={item._id}
                      className="border-gray-50 hover:bg-blue-50/30 transition-colors"
                    >
                      <TableCell className="font-mono text-gray-400 text-[11px] text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600 text-[11px] text-left">
                        {item.material?.code || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900 text-left">
                        {item.material?.name}
                        {item.material?.brand && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({item.material.brand})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-gray-900">
                          {item.qtyReceived}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold ml-1">
                          {item.unit}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Sticky Totals Bar */}
        <ReusableSummaryCard items={summaryItems} />

        <DialogFooter className="no-print sticky bottom-0 bg-white border-t border-gray-100 p-6 flex flex-col sm:flex-row gap-3 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] rounded-b-sm justify-end">
          <Button
            variant="outline"
            className="rounded-sm font-bold flex-1 md:flex-none"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Close
          </Button>

          {['DRAFT', 'CONFIRMED'].includes(grn.status) && (
            <div className="flex flex-1 sm:flex-none gap-2">
              <Button
                variant="outline"
                className="rounded-sm font-bold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 flex-1 sm:flex-none"
                onClick={() => setShowConfirmCancel(true)}
                disabled={isProcessing || !canDeleteGrn}
                icon={XOctagon}
              >
                Cancel GRN
              </Button>
            </div>
          )}
        </DialogFooter>
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
        title="Batalkan Goods Receipt Note (GRN)"
        description="Apakah Anda yakin ingin membatalkan dokumen penerimaan barang ini?"
        footer={
          <div className="flex w-full justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmCancel(false);
                setCancelReason('');
                setReasonError('');
              }}
              disabled={isProcessing}
              className="text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 h-9 rounded-sm"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              isLoading={isProcessing}
              onClick={handleCancel}
              disabled={cancelReason.trim().length < 6}
              className="h-9 font-bold rounded-sm"
            >
              Ya, Batalkan GRN
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Apakah Anda yakin ingin membatalkan penerimaan barang{' '}
            <strong className="text-gray-900 font-mono">{grn.grnNumber}</strong>
            ? Tindakan ini akan mengembalikan stok bahan baku.
          </p>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-700 mb-1 block">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <FormInput
              placeholder="Contoh: Barang fisik rusak / barang tidak sesuai pesanan..."
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
