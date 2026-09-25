'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PurchaseStatusBadge } from '@/components/ui/purchase-status-badge';
import { ReusableSummaryCard } from '@/components/ui/reusable-summary-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Eye,
  ShoppingCart,
  ArrowRight,
  Truck,
  PackageCheck,
  XCircle,
  Store,
  Calendar,
  FileText,
  Package,
  Box,
  FileCheck,
  ChevronRight,
  Printer,
  CreditCard
} from 'lucide-react';
import { RTURelatedDocs } from '@/components/shared/related-docs';
import { PrintHeader } from '@/components/print/print-header';
import { PrintFooter } from '@/components/print/print-footer';
import {
  useProcessRTUPurchase,
  useReceiveRTUPurchase,
  useCancelRTUPurchase
} from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import {
  useGetRTUPayments,
  useCompleteRTUPayment
} from '@/lib/hooks/queries/rtu-payment';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { RTUPurchase } from '@/lib/type/rtu_purchase';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toIDR } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

function formatRupiah(value?: number | null) {
  return toIDR(value);
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface PurchaseDetailsDialogProps {
  purchase: RTUPurchase;
  customTrigger?: React.ReactNode;
  readOnly?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function PurchaseDetailsDialog({
  purchase,
  customTrigger,
  readOnly = false,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onClose
}: PurchaseDetailsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printShowPrice, setPrintShowPrice] = useState(false);

  const handleExecutePrint = () => {
    setShowPrintSettings(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

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
  }, [defaultOpen, purchase?._id, isControlled]);
  const router = useRouter();

  const processMutation = useProcessRTUPurchase();
  const receiveMutation = useReceiveRTUPurchase();
  const cancelMutation = useCancelRTUPurchase();
  const { data: grnsResponse } = useGetRTUGRNs();
  const grns = grnsResponse?.data || [];

  const { data: paymentsResponse } = useGetRTUPayments();
  const completeMutation = useCompleteRTUPayment();
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);

  const handleComplete = async () => {
    if (confirmComplete) {
      await completeMutation.mutateAsync(confirmComplete);
      setConfirmComplete(null);
    }
  };
  const { data: invoicesResponse } = useGetRTUInvoiceReconciles({
    purchaseId: purchase._id
  });
  const invoices = invoicesResponse?.data || [];
  const hasConfirmedInvoice = invoices.some(
    (inv: any) => inv.status === 'CONFIRMED'
  );
  const hasActiveInvoice = invoices.some(
    (inv: any) => inv.status !== 'CANCELLED'
  );

  const paymentStats = useMemo(() => {
    const completedMap: Record<string, number> = {};
    const draftMap: Record<string, number> = {};

    if (!paymentsResponse?.data) return { completedMap, draftMap };

    paymentsResponse.data.forEach((p: any) => {
      if (p.status === 'CANCELLED') return;
      if (!p.details) return;

      const targetMap = p.status === 'DRAFT' ? draftMap : completedMap;

      p.details.forEach((det: any) => {
        if (!det.purchaseId) return;
        targetMap[det.purchaseId] =
          (targetMap[det.purchaseId] || 0) + (det.amountApplied || 0);
      });
    });

    return { completedMap, draftMap };
  }, [paymentsResponse]);

  const paidAmounts = paymentStats.completedMap;
  const draftPaidAmounts = paymentStats.draftMap;

  const { hasPermission: canUpdateInvoice } = useGetPermission(
    'update',
    'rtu_invoice'
  );

  const getReceivedQty = (
    purchaseId: string,
    materialId?: string,
    productId?: string
  ) => {
    let total = 0;
    grns.forEach((grn: any) => {
      if (grn.purchaseId === purchaseId && grn.status !== 'CANCELLED') {
        grn.items.forEach((item: any) => {
          if (materialId && item.materialId === materialId)
            total += item.qtyReceived;
          if (productId && item.productId === productId)
            total += item.qtyReceived;
        });
      }
    });
    return total;
  };

  let totalPoQty = 0;
  let totalReceivedQty = 0;
  let totalConfirmedQty = 0;
  (purchase?.items || []).forEach((item) => {
    totalPoQty += item.qty;
    totalReceivedQty += getReceivedQty(
      purchase._id,
      item.materialId,
      item.productId
    );

    // Sum only confirmed quantities for button visibility
    grns.forEach((grn: any) => {
      if (grn.purchaseId === purchase._id && grn.status === 'CONFIRMED') {
        grn.items.forEach((gItem: any) => {
          if (item.materialId && gItem.materialId === item.materialId)
            totalConfirmedQty += gItem.qtyReceived;
          if (item.productId && gItem.productId === item.productId)
            totalConfirmedQty += gItem.qtyReceived;
        });
      }
    });
  });
  const isFullyReceived = totalConfirmedQty >= totalPoQty;

  // For invoice reconcile: any confirmed GRN linked to this PO means we can create an invoice
  const hasConfirmedGrn = grns.some(
    (grn: any) => grn.purchaseId === purchase._id && grn.status === 'CONFIRMED'
  );

  const hasDraftGrn = grns.some(
    (grn: any) => grn.purchaseId === purchase._id && grn.status === 'DRAFT'
  );

  const showFollowUp =
    !isFullyReceived &&
    purchase.status !== 'COMPLETED' &&
    purchase.status !== 'CANCELLED';

  const showRekonsiliasi =
    hasConfirmedGrn && purchase.status !== 'CANCELLED' && !hasActiveInvoice;

  const totalValue = purchase.items.reduce(
    (sum, item) =>
      sum + item.unitPrice * item.qty * (1 - (item.discount || 0) / 100),
    0
  );
  const totalAmount =
    totalValue +
    (totalValue * (purchase.taxPercent || 0)) / 100 +
    (purchase.shippingFee || 0) +
    (purchase.loadingFee || 0) +
    (purchase.unloadingFee || 0) +
    (purchase.additionalCosts || []).reduce(
      (acc: number, c: any) => acc + (c.amount || 0),
      0
    );
  const paidAmount = paidAmounts[purchase._id] || 0;
  const sisaTagihan = Math.max(0, totalAmount - paidAmount);

  const summaryItems = useMemo(
    () =>
      [
        {
          label: 'Subtotal',
          value: formatRupiah(totalValue),
          valueClassName: 'text-white'
        },
        (purchase.taxPercent || 0) > 0 && {
          label: `PPN (${purchase.taxPercent}%)`,
          value: formatRupiah((totalValue * purchase.taxPercent) / 100),
          valueClassName: 'text-white'
        },
        (purchase.shippingFee || 0) > 0 && {
          label: 'Ongkos Kirim',
          value: formatRupiah(purchase.shippingFee),
          valueClassName: 'text-white'
        },
        (purchase.loadingFee || 0) > 0 && {
          label: 'Biaya Muat',
          value: formatRupiah(purchase.loadingFee),
          valueClassName: 'text-white'
        },
        (purchase.unloadingFee || 0) > 0 && {
          label: 'Biaya Bongkar',
          value: formatRupiah(purchase.unloadingFee),
          valueClassName: 'text-white'
        },
        ...(purchase.additionalCosts || []).map((c: any) => ({
          label: c.name || 'Biaya Lain',
          value: formatRupiah(c.amount || 0),
          valueClassName: 'text-white'
        })),
        {
          label: 'Total PO',
          value: formatRupiah(totalAmount),
          isHighlight: true,
          className: purchase.isLoan ? 'text-yellow-200' : 'text-white',
          valueClassName: purchase.isLoan
            ? 'text-yellow-300 text-xs font-bold'
            : 'text-white text-xs font-bold'
        },
        paidAmount > 0 && {
          label: 'Total Terbayar',
          value: formatRupiah(paidAmount),
          borderDashed: true,
          className: 'text-indigo-200',
          valueClassName: 'text-indigo-100 text-[10px]'
        },
        sisaTagihan > 0 && {
          label: 'Sisa Tagihan',
          value: formatRupiah(sisaTagihan),
          isHighlight: true,
          className: 'text-amber-200',
          valueClassName: 'text-amber-300 text-xs font-bold'
        }
      ].filter(Boolean) as any[],
    [
      totalValue,
      purchase.taxPercent,
      purchase.shippingFee,
      purchase.loadingFee,
      purchase.unloadingFee,
      purchase.additionalCosts,
      purchase.isLoan,
      totalAmount,
      paidAmount,
      sisaTagihan
    ]
  );

  const hasDraftPayment = (draftPaidAmounts[purchase._id] || 0) > 0;
  const isLoading =
    processMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending;

  const hasAction = !readOnly && (showFollowUp || showRekonsiliasi);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && confirmComplete) {
          return;
        }
        setOpen(val);
        if (!val) onClose?.();
      }}
    >
      {/* Only render triggers when not in portal/controlled mode */}
      {!defaultOpen &&
        !isControlled &&
        (customTrigger ? (
          <DialogTrigger asChild>{customTrigger}</DialogTrigger>
        ) : hasAction ? (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 rounded-sm hover:bg-gray-200 text-gray-600 animate-none transition-colors"
                type="button"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold rounded-sm border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 gap-1.5 animate-none transition-colors"
                type="button"
                icon={PackageCheck}
              >
                Follow Up
              </Button>
            </DialogTrigger>
          </div>
        ) : (
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 rounded-sm hover:bg-gray-200 text-gray-600 animate-none transition-colors"
              type="button"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </DialogTrigger>
        ))}
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0 border-none shadow-3xl bg-white flex flex-col rounded-sm">
        {/* PROFESSIONAL PRINT SECTION */}
        <div className="print-only">
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 6mm 8mm;
                }
                html, body {
                  background-color: white !important;
                  color: #0f172a !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                header, sidebar, nav, button, .no-print {
                  display: none !important;
                }
                .print-only, .print-only * {
                  visibility: visible !important;
                }
                .print-only {
                  position: relative !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 0 10mm 0 !important;
                  background-color: white !important;
                  color: #0f172a !important;
                  z-index: 99999 !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                .po-print-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin-top: 0.75rem !important;
                  font-size: 11px !important;
                }
                .po-print-table th {
                  background-color: #0f172a !important;
                  color: #ffffff !important;
                  padding: 8px 10px !important;
                  font-size: 10px !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.05em !important;
                  border: none !important;
                }
                .po-print-table td {
                  padding: 8px 10px !important;
                  border-bottom: 1px solid #e2e8f0 !important;
                  color: #1e293b;
                }
                .po-print-table tbody tr:nth-child(even) {
                  background-color: #f8fafc !important;
                }
                .po-print-table tr.bg-slate-900 td {
                  background-color: #0f172a !important;
                  color: #ffffff !important;
                }
                .po-print-footer {
                  position: fixed !important;
                  bottom: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  width: 100% !important;
                  background-color: #ffffff !important;
                  padding-top: 6px !important;
                  padding-bottom: 2px !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `
            }}
          />

          <div className="po-print-body flex-1">
            {/* Header & Corporate Logo Branding */}
            <PrintHeader
              title="PURCHASE ORDER (PO)"
              docNumber={purchase.docNumber}
              dateLabel="Tanggal PO"
              dateValue={purchase.requestDate}
            />

            {/* 2-Column Vendor & Buyer Info Cards */}
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              {/* Vendor Card */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-sm space-y-0.5">
                <span className="text-[8px] font-bold tracking-wider text-slate-500 uppercase block">
                  PEMASOK (VENDOR / SELLER)
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {purchase.vendor?.name ||
                    purchase.seller?.label ||
                    purchase.seller?.name ||
                    purchase.vendorId ||
                    purchase.sellerId ||
                    '-'}
                </p>
                {(purchase.vendor?.address || purchase.seller?.address) && (
                  <p className="text-[9px] text-slate-600 leading-tight">
                    {purchase.vendor?.address || purchase.seller?.address}
                  </p>
                )}
                {(purchase.vendor?.phone ||
                  purchase.vendor?.contactPerson ||
                  purchase.vendor?.picPhone) && (
                  <p className="text-[9px] text-slate-500">
                    Kontak:{' '}
                    {purchase.vendor?.phone ||
                      purchase.vendor?.contactPerson ||
                      purchase.vendor?.picPhone ||
                      purchase.vendor?.picName}
                  </p>
                )}
              </div>

              {/* Buyer Card */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-sm space-y-0.5">
                <span className="text-[8px] font-bold tracking-wider text-slate-500 uppercase block">
                  PEMBELI (DESTINASI CABANG / BUYER)
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {purchase.buyer?.label ||
                    purchase.buyer?.name ||
                    purchase.buyerId ||
                    '-'}
                </p>
                {purchase.buyer?.address && (
                  <p className="text-[9px] text-slate-600 leading-tight">
                    {purchase.buyer?.address}
                  </p>
                )}
                <p className="text-[9px] text-slate-500">
                  Tipe Pesanan:{' '}
                  <strong className="capitalize text-slate-800">
                    {purchase.type || 'Material'}
                  </strong>
                </p>
              </div>
            </div>

            {/* Order Items Table */}
            <table className="po-print-table">
              <thead>
                <tr>
                  <th className="text-center w-12">NO</th>
                  <th className="text-left">ITEM</th>
                  <th className="text-right w-20">QTY</th>
                  <th className="text-center w-24">SATUAN</th>
                  {printShowPrice && (
                    <>
                      <th className="text-right w-28">HARGA SATUAN</th>
                      <th className="text-center w-20">DISKON</th>
                      <th className="text-right w-24">PPN</th>
                      <th className="text-right w-32">TOTAL</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, idx) => {
                  const subtotal =
                    (item.qty || 0) *
                    (item.unitPrice || 0) *
                    (1 - (item.discount || 0) / 100);
                  const ppn = (subtotal * (purchase.taxPercent || 0)) / 100;
                  return (
                    <tr key={idx}>
                      <td className="text-center font-mono text-xs text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="font-bold text-slate-900 text-xs">
                        {purchase.type === 'PRODUCT' ? (
                          item.product?.name || '-'
                        ) : (
                          <>
                            {item.material?.name || '-'}
                            {item.material?.brand && (
                              <span className="text-slate-500 font-normal ml-1 text-[11px]">
                                ({item.material.brand})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold text-slate-900 text-xs">
                        {item.qty}
                      </td>
                      <td className="text-center font-semibold text-slate-700 text-xs">
                        {item.unit}
                      </td>
                      {printShowPrice && (
                        <>
                          <td className="text-right font-mono text-xs text-slate-800">
                            {toIDR(item.unitPrice)}
                          </td>
                          <td className="text-center font-mono text-xs text-slate-700">
                            {item.discount || 0}%
                          </td>
                          <td className="text-right font-mono text-xs text-slate-800">
                            {purchase.taxPercent > 0 ? toIDR(ppn) : '-'}
                          </td>
                          <td className="text-right font-mono font-bold text-slate-950 text-xs">
                            {toIDR(subtotal)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {printShowPrice && (
                  <>
                    <tr className="border-t-2 border-slate-900 bg-slate-100 font-semibold">
                      <td
                        colSpan={6}
                        className="text-right uppercase text-[10px] tracking-wider text-slate-700"
                      >
                        Subtotal:
                      </td>
                      <td
                        className="text-right text-xs font-mono font-bold text-slate-900"
                        colSpan={2}
                      >
                        {toIDR(totalValue)}
                      </td>
                    </tr>
                    {(purchase.taxPercent || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td
                          colSpan={6}
                          className="text-right uppercase text-[10px] tracking-wider text-slate-600"
                        >
                          PPN ({purchase.taxPercent}%):
                        </td>
                        <td
                          className="text-right text-xs font-mono font-semibold text-slate-900"
                          colSpan={2}
                        >
                          {toIDR(
                            (totalValue * (purchase.taxPercent || 0)) / 100
                          )}
                        </td>
                      </tr>
                    )}
                    {(purchase.shippingFee || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td
                          colSpan={6}
                          className="text-right text-[10px] font-semibold text-slate-600 uppercase"
                        >
                          Ongkos Kirim:
                        </td>
                        <td
                          className="text-right text-xs font-mono font-semibold text-slate-900"
                          colSpan={2}
                        >
                          {toIDR(purchase.shippingFee)}
                        </td>
                      </tr>
                    )}
                    {(purchase.loadingFee || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td
                          colSpan={6}
                          className="text-right text-[10px] font-semibold text-slate-600 uppercase"
                        >
                          Biaya Muat:
                        </td>
                        <td
                          className="text-right text-xs font-mono font-semibold text-slate-900"
                          colSpan={2}
                        >
                          {toIDR(purchase.loadingFee)}
                        </td>
                      </tr>
                    )}
                    {(purchase.unloadingFee || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td
                          colSpan={6}
                          className="text-right text-[10px] font-semibold text-slate-600 uppercase"
                        >
                          Biaya Bongkar:
                        </td>
                        <td
                          className="text-right text-xs font-mono font-semibold text-slate-900"
                          colSpan={2}
                        >
                          {toIDR(purchase.unloadingFee)}
                        </td>
                      </tr>
                    )}
                    {(purchase.additionalCosts || []).map(
                      (c: any, cIdx: number) => (
                        <tr key={cIdx} className="bg-slate-50">
                          <td
                            colSpan={6}
                            className="text-right text-[10px] font-semibold text-slate-600 uppercase"
                          >
                            {c.name || 'Biaya Lain'}:
                          </td>
                          <td
                            className="text-right text-xs font-mono font-semibold text-slate-900"
                            colSpan={2}
                          >
                            {toIDR(c.amount)}
                          </td>
                        </tr>
                      )
                    )}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td
                        colSpan={6}
                        className="text-right uppercase text-[11px] tracking-wider text-white font-bold"
                      >
                        GRAND TOTAL:
                      </td>
                      <td
                        className="text-right text-sm font-mono text-white font-extrabold"
                        colSpan={2}
                      >
                        {toIDR(totalAmount)}
                      </td>
                    </tr>
                    {purchase.paymentType === 'DP' && purchase.dpAmount > 0 && (
                      <>
                        <tr className="bg-emerald-50">
                          <td
                            colSpan={6}
                            className="text-right uppercase text-[10px] text-emerald-800 font-bold"
                          >
                            DP / Uang Muka:
                          </td>
                          <td
                            className="text-right text-xs font-mono text-emerald-700 font-bold"
                            colSpan={2}
                          >
                            - {toIDR(purchase.dpAmount)}
                          </td>
                        </tr>
                        <tr className="bg-rose-50 border-t border-rose-200">
                          <td
                            colSpan={6}
                            className="text-right uppercase text-[10px] text-rose-800 font-bold"
                          >
                            Sisa Tagihan:
                          </td>
                          <td
                            className="text-right text-sm font-mono text-rose-700 font-extrabold"
                            colSpan={2}
                          >
                            {toIDR(
                              Math.max(0, totalAmount - purchase.dpAmount)
                            )}
                          </td>
                        </tr>
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>

            {/* Notes Alert Section */}
            <div className="mt-4 bg-slate-50 border-l-4 border-slate-800 p-3 rounded-sm space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                CATATAN ORDER:
              </span>
              <p className="text-xs font-medium text-slate-800 italic leading-relaxed">
                {purchase.notes || 'Tidak ada catatan tambahan.'}
              </p>
            </div>

            {/* Generated Footer with Date and Time */}
            <PrintFooter />
          </div>
        </div>

        <DialogHeader className="no-print p-6 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-sm">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {purchase.docNumber}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <PurchaseStatusBadge
                    status={purchase.status}
                    isVendor={!!purchase.vendor}
                    qtyPo={totalPoQty}
                    qtyReceived={totalReceivedQty}
                    className="text-[10px] px-2 py-0.5"
                    paidAmount={paidAmount}
                    draftPaidAmount={draftPaidAmounts[purchase._id] || 0}
                    totalAmount={totalAmount}
                    hasConfirmedInvoice={hasConfirmedInvoice}
                  />
                  <Badge
                    className={`text-[10px] font-bold rounded-sm px-2 py-0.5 ${
                      purchase.type === 'PRODUCT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {purchase.type === 'PRODUCT' ? (
                      <>
                        <Package className="w-3 h-3 inline mr-1" />
                        Produk Jadi
                      </>
                    ) : (
                      <>
                        <Box className="w-3 h-3 inline mr-1" />
                        Bahan Baku
                      </>
                    )}
                  </Badge>
                  {purchase.isLoan && (
                    <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold rounded-sm px-2 py-0.5">
                      Transaksi Pinjaman
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPrintSettings(true)}
              className="mr-8"
              icon={Printer}
            >
              Cetak PO
            </Button>
          </div>
        </DialogHeader>

        <div className="no-print flex-1 overflow-y-auto min-h-0 p-6">
          <div className="space-y-6">
            {/* Metadata Section: Flow, Dates, and Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Flow Indicator (Who) */}
              <div
                className={`flex items-center justify-center gap-6 rounded-sm p-4 border ${
                  purchase.isLoan
                    ? 'bg-yellow-50/40 border-yellow-100/60'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="text-center min-w-0">
                  <Store
                    className={`w-5 h-5 mx-auto mb-1 flex-shrink-0 ${purchase.isLoan ? 'text-yellow-600' : 'text-blue-500'}`}
                  />
                  <p
                    className="text-sm font-bold text-gray-800 truncate"
                    title={purchase.buyer?.label || purchase.buyer?.name}
                  >
                    {purchase.buyer?.label || purchase.buyer?.name || 'Pembeli'}
                  </p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">
                    Pembeli
                  </p>
                </div>

                <div className="flex flex-col items-center flex-shrink-0">
                  <ArrowRight
                    className={`w-4 h-4 ${purchase.isLoan ? 'text-yellow-400' : 'text-gray-300'}`}
                  />
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                    {purchase.isLoan ? 'Pinjam' : 'Beli'}
                  </span>
                </div>

                <div className="text-center min-w-0">
                  <Store
                    className={`w-5 h-5 mx-auto mb-1 flex-shrink-0 ${purchase.isLoan ? 'text-yellow-600' : 'text-emerald-500'}`}
                  />
                  <p
                    className="text-sm font-bold text-gray-800 truncate"
                    title={
                      purchase.seller?.label ||
                      purchase.seller?.name ||
                      purchase.vendor?.name
                    }
                  >
                    {purchase.seller?.label ||
                      purchase.seller?.name ||
                      purchase.vendor?.name ||
                      'Penjual'}
                  </p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">
                    {purchase.vendor ? 'Vendor' : 'Penjual'}
                  </p>
                </div>
              </div>

              {/* 2. Dates Card (When) */}
              <div className="bg-gray-50 p-4 rounded-sm border border-gray-100 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 leading-none">
                      Tgl. Permintaan
                    </p>
                    <p className="text-sm font-normal text-gray-800 mt-1">
                      {formatDate(purchase.requestDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-gray-200/60 pt-2">
                  <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 leading-none">
                      Tgl. Diproses
                    </p>
                    <p className="text-sm font-normal text-gray-800 mt-1">
                      {formatDate(purchase.processDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Catatan Card (What/Note) */}
              <div className="bg-gray-50 p-4 rounded-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-white rounded-sm shadow-sm text-gray-500 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-700">Catatan</p>
                  <p
                    className="font-normal text-gray-600 text-xs mt-0.5 break-words"
                    title={purchase.notes}
                  >
                    {purchase.notes || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dokumen Terkait (GRN, Invoice, Payment) */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">
                Dokumen Terkait
              </h3>
              <RTURelatedDocs
                purchaseId={purchase._id}
                excludeDocId={purchase._id}
              />
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-3">
                Daftar Item
              </h3>
              <div className="rounded-sm border border-gray-200 overflow-hidden">
                <Table containerClassName="h-auto" className="w-full">
                  <TableHeader className="bg-slate-900">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold">
                        #
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold">
                        Nama
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Qty PO
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Qty Diterima
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Qty Sisa
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Harga/Unit
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-center">
                        Diskon
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        PPN
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items.map((item, i) => {
                      const name =
                        purchase.type === 'PRODUCT' ? (
                          item.product?.name || '-'
                        ) : (
                          <>
                            {item.material?.name || '-'}
                            {item.material?.brand && (
                              <span className="text-gray-500 font-normal ml-1">
                                ({item.material.brand})
                              </span>
                            )}
                          </>
                        );
                      const subtotal =
                        item.unitPrice *
                        item.qty *
                        (1 - (item.discount || 0) / 100);
                      const ppn = (subtotal * (purchase.taxPercent || 0)) / 100;
                      const receivedQty = getReceivedQty(
                        purchase._id,
                        item.materialId,
                        item.productId
                      );
                      const sisaQty = Math.max(0, item.qty - receivedQty);

                      return (
                        <TableRow key={item._id} className="hover:bg-gray-50">
                          <TableCell className="text-xs font-mono text-gray-500">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-sm font-bold text-gray-800">
                            {name}
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono">
                            {item.qty}{' '}
                            <span className="text-gray-500 text-xs">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono text-emerald-600 font-bold">
                            {receivedQty}{' '}
                            <span className="text-emerald-500/70 text-xs font-normal">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono text-orange-600 font-bold">
                            {sisaQty}{' '}
                            <span className="text-orange-500/70 text-xs font-normal">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono text-gray-600">
                            {item.unitPrice > 0 ? (
                              formatRupiah(item.unitPrice)
                            ) : (
                              <span className="text-gray-300 text-xs italic">
                                belum diproses
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-center font-bold text-gray-500">
                            {item.discount || 0}%
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono text-gray-600">
                            {item.unitPrice > 0 && purchase.taxPercent > 0 ? (
                              formatRupiah(ppn)
                            ) : (
                              <span className="text-gray-300 text-xs italic">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right font-bold text-gray-800">
                            {item.unitPrice > 0 ? formatRupiah(subtotal) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Totals Bar */}
        {totalValue > 0 && <ReusableSummaryCard items={summaryItems} />}

        {/* Footer Actions */}
        <div className="no-print p-6 pt-4 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Close
          </Button>

          {!readOnly && purchase.status === 'DRAFT' && (
            <>
              <Button
                variant="destructive"
                disabled={isLoading}
                onClick={() =>
                  cancelMutation.mutate(purchase._id, {
                    onSuccess: () => setOpen(false)
                  })
                }
                className="rounded-sm h-12 px-6 font-bold gap-2"
              >
                <XCircle className="w-4 h-4" /> Batalkan PO
              </Button>
              <Button
                disabled={isLoading}
                onClick={() =>
                  processMutation.mutate(purchase._id, {
                    onSuccess: () => setOpen(false)
                  })
                }
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-sm h-12 font-bold gap-2"
              >
                <Truck className="w-4 h-4" />
                {processMutation.isPending ? 'MEMPROSES...' : 'Proses'}
              </Button>
            </>
          )}

          {!readOnly &&
            purchase.status === 'PROCESSING' &&
            !isFullyReceived && (
              <Button
                disabled={isLoading}
                onClick={() => {
                  setOpen(false);
                  if (hasDraftGrn && totalReceivedQty >= totalPoQty) {
                    // Redirect to GRN list page to let them confirm the draft
                    router.push('/rtu/grn');
                    toast.info(
                      'Silakan konfirmasi draft GRN yang sudah ada di halaman Penerimaan Barang'
                    );
                  } else {
                    // Redirect to GRN create page
                    router.push(`/rtu/grn?action=create&poId=${purchase._id}`);
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm h-12 font-bold gap-2"
                icon={PackageCheck}
              >
                {hasDraftGrn && totalReceivedQty >= totalPoQty
                  ? 'Konfirmasi Draft GRN di Penerimaan Barang'
                  : 'Konfirmasi Terima Barang (GRN)'}{' '}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

          {!readOnly && showRekonsiliasi && (
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm h-12 font-bold gap-2 shadow-md shadow-indigo-200"
              disabled={!canUpdateInvoice}
              onClick={() => {
                router.push(`/rtu/invoice?action=create&poId=${purchase._id}`);
              }}
              icon={FileCheck}
            >
              Lakukan Rekonsiliasi <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {!readOnly &&
            paidAmount < totalAmount &&
            !hasDraftPayment &&
            (hasActiveInvoice ? (
              <Button
                onClick={() => {
                  setOpen(false);
                  router.push(
                    `/rtu/payment?action=create&poId=${purchase._id}`
                  );
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm h-12 font-bold gap-2 shadow-md shadow-indigo-200"
                icon={CreditCard}
              >
                Bayar Tagihan (Pelunasan) <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setOpen(false);
                  router.push(
                    `/rtu/payment?action=create&poId=${purchase._id}&isDp=true`
                  );
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm h-12 font-bold gap-2 shadow-md shadow-indigo-200"
                icon={CreditCard}
              >
                Bayar DP (Uang Muka) <ChevronRight className="w-4 h-4" />
              </Button>
            ))}

          {!readOnly && hasDraftPayment && (
            <Button
              onClick={() => {
                const draftPayment = (paymentsResponse?.data || []).find(
                  (p: any) =>
                    p.status === 'DRAFT' &&
                    p.details?.some((d: any) => d.purchaseId === purchase._id)
                );
                if (draftPayment) {
                  setConfirmComplete(draftPayment._id);
                }
              }}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-sm h-12 font-bold gap-2 shadow-md shadow-amber-200"
              icon={CreditCard}
              disabled={isLoading || completeMutation.isPending}
            >
              Konfirmasi Pembayaran (Draft) <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
      <ConfirmationDialog
        open={!!confirmComplete}
        onOpenChange={(v) => !v && setConfirmComplete(null)}
        onConfirm={handleComplete}
        title="Konfirmasi Pembayaran"
        description="Apakah Anda yakin ingin mengkonfirmasi pembayaran ini? Mengonfirmasi pembayaran menandakan bahwa transaksi pembayaran sudah selesai/dilakukan. Tindakan ini tidak dapat dibatalkan."
        isLoading={completeMutation.isPending}
      />

      {/* PRINT SETTINGS MODAL */}
      <Dialog open={showPrintSettings} onOpenChange={setShowPrintSettings}>
        <DialogContent
          className="max-w-md bg-white rounded-sm p-6 shadow-2xl border border-gray-100 no-print"
          onFocusOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-3 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              Pengaturan Cetak Purchase Order
            </DialogTitle>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Sesuaikan opsi print sebelum mencetak dokumen
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Opsi Harga */}
            <div className="flex items-start justify-between space-x-4 p-3 bg-slate-50 rounded-sm border border-slate-200/80">
              <div className="space-y-1">
                <label
                  htmlFor="printShowPrice"
                  className="text-sm font-bold text-gray-800 cursor-pointer select-none block"
                >
                  Tampilkan Harga pada Print
                </label>
                <p className="text-[11px] text-gray-500 font-normal leading-relaxed">
                  Bila dinonaktifkan, kolom Harga Satuan, Diskon, PPN, Subtotal,
                  dan Grand Total akan disembunyikan.
                </p>
              </div>
              <Checkbox
                id="printShowPrice"
                checked={printShowPrice}
                onCheckedChange={(checked) =>
                  setPrintShowPrice(checked === true)
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrintSettings(false)}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleExecutePrint}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              icon={Printer}
            >
              Cetak Dokumen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
