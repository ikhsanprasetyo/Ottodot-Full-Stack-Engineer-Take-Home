'use client';

import { RTUPurchase } from '@/lib/type/rtu_purchase';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Store,
  Trash2,
  Eye,
  EyeOff,
  PackageCheck,
  Truck,
  FileCheck,
  CreditCard,
  Printer,
  XCircle
} from 'lucide-react';
import { EditPurchaseDialog } from './edit-purchase-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { DailyDetailsDialogBase } from '@/components/shared/daily-details-dialog-base';
import { DocumentStatusBadge } from '@/components/ui/document-status-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { RTURelatedDocs } from '@/components/shared/related-docs';
import {
  useProcessRTUPurchase,
  useCancelRTUPurchase
} from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import {
  useGetRTUPayments,
  useCompleteRTUPayment
} from '@/lib/hooks/queries/rtu-payment';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useRouter } from 'next/navigation';
import { toIDR } from '@/lib/utils';

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

function DeletePurchaseButton({
  purchase,
  disabled
}: {
  purchase: RTUPurchase;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      const res = await api.post(`/rtu/purchase/cancel/${purchase._id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Purchase Order deleted & stock reversed!');
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete purchase');
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
        disabled={disabled || isDeleting}
        className="h-8 w-8 p-0 rounded-sm hover:bg-red-50 text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Batal / Hapus Purchase Order"
        description="Yakin ingin membatalkan/menghapus dokumen ini? Stok akan dikembalikan otomatis."
        onConfirm={() => deleteMutation.mutate()}
        confirmText="Ya, Batalkan"
        isDestructive={true}
      />
    </>
  );
}

interface InlinePurchaseCardProps {
  purchase: RTUPurchase;
  productName: string;
}

function InlinePurchaseCard({
  purchase,
  productName: _productName
}: InlinePurchaseCardProps) {
  const router = useRouter();
  const processMutation = useProcessRTUPurchase();
  const cancelMutation = useCancelRTUPurchase();
  const { data: grnsResponse } = useGetRTUGRNs();
  const grns = grnsResponse?.data || [];
  const { data: paymentsResponse } = useGetRTUPayments();
  const completeMutation = useCompleteRTUPayment();
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);

  const { data: invoicesResponse } = useGetRTUInvoiceReconciles({
    purchaseId: purchase._id
  });
  const invoices = invoicesResponse?.data || [];
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
  const hasConfirmedGrn = grns.some(
    (grn: any) => grn.purchaseId === purchase._id && grn.status === 'CONFIRMED'
  );
  const hasDraftGrn = grns.some(
    (grn: any) => grn.purchaseId === purchase._id && grn.status === 'DRAFT'
  );

  const _showFollowUp =
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

  const hasDraftPayment = (draftPaidAmounts[purchase._id] || 0) > 0;
  const isLoading = processMutation.isPending || cancelMutation.isPending;

  const handleComplete = async () => {
    if (confirmComplete) {
      await completeMutation.mutateAsync(confirmComplete);
      setConfirmComplete(null);
    }
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-4 transition-all">
      {/* Vendor & Date Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-sm border border-slate-100">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Pemasok / Seller
          </p>
          <p className="font-bold text-slate-800 mt-0.5">
            {purchase.seller?.name || purchase.vendor?.name || 'Unknown Vendor'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Pembeli / Buyer
          </p>
          <p className="font-bold text-slate-800 mt-0.5">
            {purchase.buyer?.name || '-'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Tanggal
          </p>
          <p className="text-slate-700 font-medium mt-0.5">
            {formatDate(purchase.requestDate)}
          </p>
        </div>
      </div>

      {/* Item Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2 text-right">Qty PO</th>
              <th className="p-2 text-right">Qty Diterima</th>
              <th className="p-2 text-right">Harga Satuan</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {purchase.items.map((item, idx) => {
              const name =
                purchase.type === 'PRODUCT'
                  ? item.product?.name || '-'
                  : item.material?.name || '-';
              const subtotal =
                item.unitPrice * item.qty * (1 - (item.discount || 0) / 100);
              const rec = getReceivedQty(
                purchase._id,
                item.materialId,
                item.productId
              );

              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 font-bold text-slate-800">{name}</td>
                  <td className="p-2 text-right font-mono">
                    {item.qty} {item.unit}
                  </td>
                  <td className="p-2 text-right font-mono text-emerald-600 font-bold">
                    {rec} {item.unit}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-600">
                    {toIDR(item.unitPrice)}
                  </td>
                  <td className="p-2 text-right font-bold text-slate-800">
                    {toIDR(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Totals */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-sm text-xs">
        <div className="space-y-1">
          {purchase.notes && (
            <p className="text-slate-600 text-[11px]">
              <span className="font-bold">Catatan:</span> {purchase.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 ml-auto text-right">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total PO
            </span>
            <span className="font-bold text-sm text-slate-900">
              {formatRupiah(totalAmount)}
            </span>
          </div>
          {paidAmount > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Terbayar
              </span>
              <span className="font-bold text-sm text-emerald-600">
                {formatRupiah(paidAmount)}
              </span>
            </div>
          )}
          {sisaTagihan > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Sisa Tagihan
              </span>
              <span className="font-bold text-sm text-amber-600">
                {formatRupiah(sisaTagihan)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dokumen Terkait */}
      <div className="space-y-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Dokumen Terkait
        </h4>
        <RTURelatedDocs purchaseId={purchase._id} excludeDocId={purchase._id} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="h-8 text-xs font-bold gap-1 rounded-sm border-slate-300 hover:bg-slate-100"
          icon={Printer}
        >
          Cetak PO
        </Button>

        {purchase.status === 'DRAFT' && (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() => cancelMutation.mutate(purchase._id)}
              className="h-8 text-xs font-bold gap-1 rounded-sm"
            >
              <XCircle className="w-3.5 h-3.5" /> Batalkan
            </Button>
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => processMutation.mutate(purchase._id)}
              className="h-8 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white rounded-sm"
            >
              <Truck className="w-3.5 h-3.5" /> Proses
            </Button>
          </>
        )}

        {purchase.status === 'PROCESSING' && !isFullyReceived && (
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => {
              if (hasDraftGrn && totalReceivedQty >= totalPoQty) {
                router.push('/rtu/grn');
                toast.info(
                  'Silakan konfirmasi draft GRN yang sudah ada di halaman Penerimaan Barang'
                );
              } else {
                router.push(`/rtu/grn?action=create&poId=${purchase._id}`);
              }
            }}
            className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            {hasDraftGrn && totalReceivedQty >= totalPoQty
              ? 'Konfirmasi Draft GRN'
              : 'Terima Barang (GRN)'}
          </Button>
        )}

        {showRekonsiliasi && (
          <Button
            size="sm"
            disabled={!canUpdateInvoice}
            onClick={() => {
              router.push(`/rtu/invoice?action=create&poId=${purchase._id}`);
            }}
            className="h-8 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm"
          >
            <FileCheck className="w-3.5 h-3.5" /> Rekonsiliasi Invoice
          </Button>
        )}

        {paidAmount < totalAmount &&
          !hasDraftPayment &&
          (hasActiveInvoice ? (
            <Button
              size="sm"
              onClick={() => {
                router.push(`/rtu/payment?action=create&poId=${purchase._id}`);
              }}
              className="h-8 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm"
            >
              <CreditCard className="w-3.5 h-3.5" /> Bayar Tagihan
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                router.push(
                  `/rtu/payment?action=create&poId=${purchase._id}&isDp=true`
                );
              }}
              className="h-8 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm"
            >
              <CreditCard className="w-3.5 h-3.5" /> Bayar DP
            </Button>
          ))}

        {hasDraftPayment && (
          <Button
            size="sm"
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
            className="h-8 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white rounded-sm"
            disabled={completeMutation.isPending}
          >
            <CreditCard className="w-3.5 h-3.5" /> Konfirmasi Pembayaran
          </Button>
        )}
      </div>

      <ConfirmationDialog
        open={!!confirmComplete}
        onOpenChange={(v) => !v && setConfirmComplete(null)}
        onConfirm={handleComplete}
        title="Konfirmasi Pembayaran"
        description="Apakah Anda yakin ingin mengkonfirmasi pembayaran ini?"
        isLoading={completeMutation.isPending}
      />
    </div>
  );
}

interface PurchaseDailyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  date: string;
  purchases: RTUPurchase[];
}

export function PurchaseDailyDetailsDialog({
  open,
  onOpenChange,
  productName,
  date,
  purchases
}: PurchaseDailyDetailsDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: invoicesResponse } = useGetRTUInvoiceReconciles();
  const confirmedPoIds = useMemo(() => {
    const set = new Set<string>();
    const invoices = invoicesResponse?.data || [];
    invoices.forEach((inv: any) => {
      if (inv.status === 'CONFIRMED' && inv.purchaseId) {
        set.add(inv.purchaseId);
      }
    });
    return set;
  }, [invoicesResponse]);

  const { totalQty, unit } = useMemo(() => {
    let q = 0;
    let u = '';
    purchases.forEach((purchase) => {
      const item = purchase.items.find((i) => {
        const pName =
          purchase.type === 'MATERIAL' ? i.material?.name : i.product?.name;
        return pName === productName;
      });
      if (item) {
        q += item.qty || 0;
        if (!u && item.unit) u = item.unit;
      }
    });
    return { totalQty: q, unit: u };
  }, [purchases, productName]);

  return (
    <DailyDetailsDialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Pembelian Harian"
      date={date}
      productName={productName}
      summaryLabel="Total Qty"
      summaryValue={
        <span className="inline-flex items-baseline justify-end gap-1.5">
          <span>{totalQty}</span>
          {unit && (
            <span className="text-sm font-semibold text-gray-500">{unit}</span>
          )}
        </span>
      }
      documentsLabel="Daftar Transaksi"
      items={purchases}
      icon={<ShoppingCart className="w-5 h-5" />}
      iconBgClass="bg-emerald-100 text-emerald-600"
      renderItem={(purchase) => {
        const item = purchase.items.find((i) => {
          const pName =
            purchase.type === 'MATERIAL' ? i.material?.name : i.product?.name;
          return pName === productName;
        });
        if (!item) return null;

        const isExpanded = expandedId === purchase._id;

        return (
          <div
            key={purchase._id}
            className="p-4 border border-gray-100 rounded-sm hover:border-emerald-200 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">
                    {purchase.docNumber}
                  </span>
                  <DocumentStatusBadge
                    status={purchase.status}
                    type="PO"
                    isVendor={!!purchase.vendor}
                    hasConfirmedInvoice={confirmedPoIds.has(purchase._id)}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <Store className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {purchase.seller?.name ||
                      purchase.vendor?.name ||
                      'Unknown Vendor'}
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="font-bold text-gray-800">
                    {purchase.buyer?.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l border-gray-100 sm:pl-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Qty Dibeli
                  </p>
                  <p className="font-bold text-lg text-gray-900">
                    {item.qty}{' '}
                    <span className="text-xs font-semibold text-gray-500">
                      {item.unit}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : purchase._id)
                    }
                    className={`h-8 w-8 p-0 rounded-sm transition-colors ${
                      isExpanded
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title={isExpanded ? 'Sembunyikan Details' : 'Lihat Details'}
                  >
                    {isExpanded ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <EditPurchaseDialog purchase={purchase} />
                  <DeletePurchaseButton
                    purchase={purchase}
                    disabled={purchase.status === 'CANCELLED'}
                  />
                </div>
              </div>
            </div>

            {/* Inline Expanded Transaction Inspection Card */}
            {isExpanded && (
              <InlinePurchaseCard
                purchase={purchase}
                productName={productName}
              />
            )}
          </div>
        );
      }}
    />
  );
}
