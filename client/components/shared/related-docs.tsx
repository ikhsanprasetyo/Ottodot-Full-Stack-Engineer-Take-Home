'use client';

import React, { useMemo, useState } from 'react';
import { ShoppingBag, FileText, Receipt, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toIDR } from '@/lib/utils';
import { setDateStr } from '@/lib/date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

// Import hooks
import { useGetRTUPurchase } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { useGetRTUPayments } from '@/lib/hooks/queries/rtu-payment';

interface RTURelatedDocsProps {
  purchaseId?: string;
  excludeDocId?: string;
}

type PreviewDocState = {
  type: 'PO' | 'GRN' | 'INVOICE' | 'PAYMENT';
  data: any;
} | null;

/**
 * RTURelatedDocs:
 * Menampilkan hubungan dokumen (PO, GRN, Invoice, Pembayaran) dalam grid 4-kolom.
 * Klik tombol Eye akan membuka **Inline Quick Preview Panel (Accordion/Drawer)** secara instan
 * tanpa membuka nested modal/dialog. Solusi ini 100% bebas bug auto-close Radix UI Dialog.
 */
export function RTURelatedDocs({
  purchaseId,
  excludeDocId
}: RTURelatedDocsProps) {
  // State for active inline preview panel
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState>(null);

  // Fetch matching PO
  const { data: purchase, isLoading: isPoLoading } = useGetRTUPurchase(
    purchaseId || ''
  );

  // Fetch matching GRNs
  const { data: grnsResponse } = useGetRTUGRNs();
  const matchedGrns = useMemo(() => {
    if (!purchaseId || !grnsResponse?.data) return [];
    return (grnsResponse.data as any[]).filter(
      (g: any) => g.purchaseId === purchaseId
    );
  }, [grnsResponse, purchaseId]);

  // Fetch matching Invoices
  const { data: invoicesResponse } = useGetRTUInvoiceReconciles({ purchaseId });
  const matchedInvoices = useMemo(() => {
    if (!purchaseId || !invoicesResponse?.data) return [];
    return (invoicesResponse.data as any[]).filter(
      (i: any) => i.purchaseId === purchaseId
    );
  }, [invoicesResponse, purchaseId]);

  // Fetch matching Payments
  const { data: paymentsResponse } = useGetRTUPayments();
  const matchedPayments = useMemo(() => {
    if (!purchaseId || !paymentsResponse?.data) return [];
    return (paymentsResponse.data as any[]).filter((p: any) =>
      (p.details || []).some((d: any) => d.purchaseId === purchaseId)
    );
  }, [paymentsResponse, purchaseId]);

  if (!purchaseId) {
    return (
      <div className="text-center p-4 border border-dashed border-gray-200 rounded-sm text-gray-400 text-xs">
        Tidak terhubung dengan Purchase Order (PO)
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'SUKSES':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'CANCELLED':
      case 'BATAL':
        return 'text-red-600 bg-red-50 border-red-100';
      default:
        return 'text-amber-600 bg-amber-50 border-amber-100';
    }
  };

  const handleTogglePreview = (
    type: 'PO' | 'GRN' | 'INVOICE' | 'PAYMENT',
    data: any
  ) => {
    if (previewDoc?.type === type && previewDoc.data._id === data._id) {
      setPreviewDoc(null);
    } else {
      setPreviewDoc({ type, data });
    }
  };

  return (
    <div className="border border-gray-200 rounded-sm p-3 shadow-sm bg-white hover:border-gray-300 transition-all no-print overflow-hidden w-full max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {/* 1. PURCHASE ORDER SECTION */}
        <div className="flex flex-col gap-1.5 pb-2 sm:pb-0 sm:px-2 first:pl-0 last:pr-0 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-gray-500">
            <ShoppingBag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              Purchase Order
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {isPoLoading ? (
              <span className="text-[11px] text-gray-400">Loading...</span>
            ) : purchase ? (
              <div
                className={`flex flex-wrap items-center gap-1.5 border rounded-sm pl-2 pr-1 py-1 shadow-sm max-w-full min-w-0 ${
                  purchase._id === excludeDocId
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                    : previewDoc?.type === 'PO' &&
                        previewDoc.data._id === purchase._id
                      ? 'bg-indigo-100/70 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-gray-50 border-gray-100'
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-indigo-700 break-all">
                  {purchase.docNumber}
                </span>
                <span
                  className={`text-[8px] font-bold uppercase px-1 border rounded-sm whitespace-nowrap shrink-0 ${getStatusColor(purchase.status)}`}
                >
                  {purchase.status}
                </span>
                {purchase._id === excludeDocId ? (
                  <Badge
                    variant="outline"
                    className="h-4.5 text-[8px] bg-indigo-100 text-indigo-700 border-indigo-200 rounded-sm font-bold px-1 py-0 whitespace-nowrap shrink-0"
                  >
                    Saat ini
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    icon={Eye}
                    className={`h-4.5 w-4.5 p-0 rounded-sm shrink-0 cursor-pointer flex items-center justify-center ${
                      previewDoc?.type === 'PO' &&
                      previewDoc.data._id === purchase._id
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'hover:bg-indigo-100 hover:text-indigo-700 text-indigo-600'
                    }`}
                    title={
                      previewDoc?.type === 'PO' &&
                      previewDoc.data._id === purchase._id
                        ? 'Sembunyikan Rincian PO'
                        : 'Lihat Rincian PO'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleTogglePreview('PO', purchase);
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  />
                )}
              </div>
            ) : (
              <span className="text-[11px] text-gray-400 italic">
                PO tidak ditemukan
              </span>
            )}
          </div>
        </div>

        {/* 2. GRN SECTION */}
        <div className="flex flex-col gap-1.5 pt-2 sm:pt-0 sm:px-2 last:pr-0 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-gray-500">
            <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              Penerimaan (GRN)
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {matchedGrns.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic font-normal">
                Belum ada GRN
              </span>
            ) : (
              matchedGrns.map((grn: any) => {
                const isActive = grn._id === excludeDocId;
                const isSelected =
                  previewDoc?.type === 'GRN' && previewDoc.data._id === grn._id;
                return (
                  <div
                    key={grn._id}
                    className={`flex flex-wrap items-center gap-1.5 border rounded-sm pl-2 pr-1 py-1 shadow-sm max-w-full min-w-0 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                        : isSelected
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-[10px] text-gray-700 font-mono font-bold break-all">
                      {grn.grnNumber}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase px-1 border rounded-sm whitespace-nowrap shrink-0 ${getStatusColor(grn.status)}`}
                    >
                      {grn.status}
                    </span>
                    {isActive ? (
                      <Badge
                        variant="outline"
                        className="h-4.5 text-[8px] bg-indigo-100 text-indigo-700 border-indigo-200 rounded-sm font-bold px-1 py-0 whitespace-nowrap shrink-0"
                      >
                        Saat ini
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Eye}
                        className={`h-4.5 w-4.5 p-0 rounded-sm shrink-0 cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600'
                        }`}
                        title={
                          isSelected
                            ? 'Sembunyikan Rincian GRN'
                            : 'Lihat Rincian GRN'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTogglePreview('GRN', grn);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. INVOICES SECTION */}
        <div className="flex flex-col gap-1.5 pt-2 sm:pt-0 sm:px-2 last:pr-0 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Receipt className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              Invoice Reconcile
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {matchedInvoices.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic font-normal">
                Belum ada Invoice
              </span>
            ) : (
              matchedInvoices.map((inv: any) => {
                const isActive = inv._id === excludeDocId;
                const isSelected =
                  previewDoc?.type === 'INVOICE' &&
                  previewDoc.data._id === inv._id;
                return (
                  <div
                    key={inv._id}
                    className={`flex flex-wrap items-center gap-1.5 border rounded-sm pl-2 pr-1 py-1 shadow-sm max-w-full min-w-0 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                        : isSelected
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-[10px] text-gray-700 font-mono font-bold break-all">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase px-1 border rounded-sm whitespace-nowrap shrink-0 ${getStatusColor(inv.status)}`}
                    >
                      {inv.status}
                    </span>
                    {isActive ? (
                      <Badge
                        variant="outline"
                        className="h-4.5 text-[8px] bg-indigo-100 text-indigo-700 border-indigo-200 rounded-sm font-bold px-1 py-0 whitespace-nowrap shrink-0"
                      >
                        Saat ini
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Eye}
                        className={`h-4.5 w-4.5 p-0 rounded-sm shrink-0 cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'hover:bg-amber-100 hover:text-amber-700 text-amber-600'
                        }`}
                        title={
                          isSelected
                            ? 'Sembunyikan Rincian Invoice'
                            : 'Lihat Rincian Invoice'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTogglePreview('INVOICE', inv);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. PAYMENTS SECTION */}
        <div className="flex flex-col gap-1.5 pt-2 sm:pt-0 sm:px-2 last:pr-0 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Receipt className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              Pembayaran
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-0.5">
            {matchedPayments.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic font-normal">
                Belum ada Pembayaran
              </span>
            ) : (
              matchedPayments.map((pmt: any) => {
                const isActive = pmt._id === excludeDocId;
                const isSelected =
                  previewDoc?.type === 'PAYMENT' &&
                  previewDoc.data._id === pmt._id;
                return (
                  <div
                    key={pmt._id}
                    className={`flex flex-wrap items-center gap-1.5 border rounded-sm pl-2 pr-1 py-1 shadow-sm max-w-full min-w-0 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                        : isSelected
                          ? 'bg-orange-100/70 border-orange-300 text-orange-900 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-[10px] text-gray-700 font-mono font-bold break-all">
                      {pmt.docNumber}
                    </span>
                    <span className="text-[9px] font-bold font-mono text-emerald-700 whitespace-nowrap shrink-0">
                      ({toIDR(pmt.amount)})
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase px-1 border rounded-sm whitespace-nowrap shrink-0 ${getStatusColor(pmt.status)}`}
                    >
                      {pmt.status}
                    </span>
                    {isActive ? (
                      <Badge
                        variant="outline"
                        className="h-4.5 text-[8px] bg-indigo-100 text-indigo-700 border-indigo-200 rounded-sm font-bold px-1 py-0 whitespace-nowrap shrink-0"
                      >
                        Saat ini
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Eye}
                        className={`h-4.5 w-4.5 p-0 rounded-sm shrink-0 cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'hover:bg-orange-100 hover:text-orange-700 text-orange-600'
                        }`}
                        title={
                          isSelected
                            ? 'Sembunyikan Rincian Pembayaran'
                            : 'Lihat Rincian Pembayaran'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTogglePreview('PAYMENT', pmt);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/*
       * INLINE QUICK PREVIEW PANEL (UI/UX Pro Max - Clean Light Theme)
       * Menampilkan detail dokumen terkait secara instan tanpa nested modal.
       */}
      {previewDoc && (
        <div className="mt-3 border border-gray-200 bg-slate-50/90 text-gray-900 rounded-sm p-3.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold px-1.5 py-0.5"
              >
                Rincian{' '}
                {previewDoc.type === 'PO'
                  ? 'Purchase Order'
                  : previewDoc.type === 'GRN'
                    ? 'Penerimaan GRN'
                    : previewDoc.type === 'INVOICE'
                      ? 'Invoice Reconcile'
                      : 'Pembayaran'}
              </Badge>
              <span className="font-mono text-xs font-bold text-gray-900 tracking-tight">
                {previewDoc.type === 'PO'
                  ? previewDoc.data.docNumber
                  : previewDoc.type === 'GRN'
                    ? previewDoc.data.grnNumber
                    : previewDoc.type === 'INVOICE'
                      ? previewDoc.data.invoiceNumber
                      : previewDoc.data.docNumber}
              </span>
              <span
                className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border rounded-sm ${getStatusColor(previewDoc.data.status)}`}
              >
                {previewDoc.data.status}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setPreviewDoc(null);
              }}
              title="Tutup Preview"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-white border border-gray-200 rounded-sm mb-3 text-[11px] shadow-xs">
            <div>
              <span className="text-gray-500 text-[9px] uppercase font-bold block">
                Tanggal
              </span>
              <span className="font-bold text-gray-800">
                {setDateStr(
                  previewDoc.data.purchaseDate ||
                    previewDoc.data.grnDate ||
                    previewDoc.data.invoiceDate ||
                    previewDoc.data.paymentDate ||
                    previewDoc.data.createdAt,
                  'DD MMMM YYYY'
                )}
              </span>
            </div>
            {previewDoc.type !== 'PAYMENT' ? (
              <div>
                <span className="text-gray-500 text-[9px] uppercase font-bold block">
                  Penjual / Vendor
                </span>
                <span className="font-bold text-gray-800 truncate block">
                  {previewDoc.data.vendor?.name ||
                    previewDoc.data.seller?.name ||
                    previewDoc.data.seller?.label ||
                    previewDoc.data.purchase?.vendor?.name ||
                    previewDoc.data.purchase?.seller?.name ||
                    '-'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-gray-500 text-[9px] uppercase font-bold block">
                  Metode / Akun
                </span>
                <span className="font-bold text-gray-800">
                  {previewDoc.data.method === 'TRANSFER'
                    ? 'Transfer Bank'
                    : previewDoc.data.method === 'GIRO'
                      ? 'Giro'
                      : previewDoc.data.method === 'CASH'
                        ? 'Tunai / Kas'
                        : previewDoc.data.method || 'Tunai / Kas'}
                  {[
                    previewDoc.data.bankName,
                    previewDoc.data.bankAccount
                  ].filter(Boolean).length > 0
                    ? ` (${[previewDoc.data.bankName, previewDoc.data.bankAccount].filter(Boolean).join(' - ')})`
                    : ''}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500 text-[9px] uppercase font-bold block">
                {previewDoc.type === 'GRN'
                  ? 'Total Line Item'
                  : 'Total Nominal'}
              </span>
              <span className="font-mono font-bold text-emerald-600 text-xs">
                {previewDoc.type === 'GRN'
                  ? `${(previewDoc.data.items || []).length} Line Item`
                  : toIDR(
                      previewDoc.data.totalAmount ||
                        previewDoc.data.grandTotal ||
                        previewDoc.data.amount ||
                        (previewDoc.data.items || []).reduce(
                          (acc: number, it: any) =>
                            acc +
                            (it.subtotal ??
                              (it.qtyInvoiced ??
                                it.qtyReceived ??
                                it.qty ??
                                0) * (it.unitPrice ?? it.price ?? 0)),
                          0
                        )
                    )}
              </span>
            </div>
          </div>

          {/* Item Details Table */}
          {previewDoc.type !== 'PAYMENT' ? (
            <div className="border border-gray-200 rounded-sm overflow-hidden bg-white shadow-xs">
              <Table
                containerClassName="h-auto max-h-[200px] overflow-y-auto"
                className="w-full text-[11px]"
              >
                <TableHeader className="bg-slate-900 sticky top-0">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-white font-bold uppercase text-[9px] w-[35px] text-center">
                      #
                    </TableHead>
                    <TableHead className="text-white font-bold uppercase text-[9px]">
                      Nama Item
                    </TableHead>
                    <TableHead className="text-white font-bold uppercase text-[9px] text-right">
                      Qty
                    </TableHead>
                    {previewDoc.type !== 'GRN' && (
                      <>
                        <TableHead className="text-white font-bold uppercase text-[9px] text-right">
                          Harga Satuan
                        </TableHead>
                        <TableHead className="text-white font-bold uppercase text-[9px] text-right">
                          Subtotal
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(previewDoc.data.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={previewDoc.type !== 'GRN' ? 5 : 3}
                        className="text-center py-3 text-gray-400 text-xs italic"
                      >
                        Tidak ada rincian item
                      </TableCell>
                    </TableRow>
                  ) : (
                    (previewDoc.data.items || []).map(
                      (it: any, idx: number) => {
                        const qty =
                          it.qtyReceived ?? it.qtyInvoiced ?? it.qty ?? 0;
                        const price = it.unitPrice ?? it.price ?? 0;
                        const subtotal = it.subtotal ?? qty * price;
                        const name =
                          it.material?.name ||
                          it.product?.name ||
                          it.name ||
                          'Item';
                        const unit = it.unit || 'unit';
                        return (
                          <TableRow
                            key={idx}
                            className="border-gray-100 hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="text-center font-mono text-gray-500 py-1.5">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-bold text-gray-800 py-1.5">
                              {name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-gray-800 py-1.5">
                              {qty}{' '}
                              <span className="text-gray-500 text-[9px] font-normal">
                                {unit}
                              </span>
                            </TableCell>
                            {previewDoc.type !== 'GRN' && (
                              <>
                                <TableCell className="text-right font-mono text-gray-600 py-1.5">
                                  {toIDR(price)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-600 py-1.5">
                                  {toIDR(subtotal)}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      }
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-sm p-3 bg-white space-y-2 text-[11px] shadow-xs">
              <span className="text-gray-500 text-[9px] uppercase font-bold block border-b border-gray-100 pb-1">
                Alokasi Pembayaran Dokumen
              </span>
              {(previewDoc.data.details || []).length === 0 ? (
                <span className="text-gray-400 italic block text-xs">
                  Tidak ada detail alokasi
                </span>
              ) : (
                (previewDoc.data.details || []).map((det: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-none"
                  >
                    <span className="font-mono text-indigo-700 font-bold">
                      PO: {det.purchase?.docNumber || 'Purchase Order'}
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {toIDR(det.amountPaid || det.amount || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notes if present */}
          {previewDoc.data.notes && (
            <div className="mt-2.5 text-[10px] text-gray-600 italic bg-amber-50/80 p-2 rounded-sm border border-amber-200/80 flex items-start gap-1">
              <span className="font-bold text-amber-800 not-italic shrink-0">
                Catatan:
              </span>
              <span>{previewDoc.data.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
