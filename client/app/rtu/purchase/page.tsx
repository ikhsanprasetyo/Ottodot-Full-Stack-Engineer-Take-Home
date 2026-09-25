/* eslint-disable */
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { SortingState } from '@tanstack/react-table';
import {
  ShoppingCart,
  Download,
  List,
  Table as TableIcon,
  CreditCard,
  Activity,
  Tag,
  Award,
  Eye
} from 'lucide-react';
import dayjs from 'dayjs';

import { useRouter } from 'next/navigation';
import { ReusableTabs } from '@/components/ui/reusable-tabs';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { TableData } from '@/components/ui/table-data';
import { Badge } from '@/components/ui/badge';
import { PurchaseStatusBadge } from '@/components/ui/purchase-status-badge';
import { DocumentLifecycleBadges } from '@/components/ui/document-lifecycle-badges';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import {
  useGetRTUPayments,
  useCompleteRTUPayment
} from '@/lib/hooks/queries/rtu-payment';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { RTUPurchase, PurchaseStatus } from '@/lib/type/rtu_purchase';
import { AddPurchaseDialog } from './add-purchase-dialog';
import { PurchaseDetailsDialog } from './purchase-details-dialog';
import { exportToExcel } from '@/lib/utils/excel-export';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { setDateStr } from '@/lib/date';
import { PurchaseTable } from './purchase-table';
import { CountCard } from '@/components/ui/count-card';
import { MonthPicker } from '@/components/shared/month-picker';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';
import { UpdateHistoryCell } from '@/components/shared/update-history-cell';
import { EditPurchaseDialog } from './edit-purchase-dialog';
import { Button } from '@/components/ui/button';
import { toIDR } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const STATUS_BADGE: Record<
  PurchaseStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border border-gray-300'
  },
  PROCESSING: {
    label: 'Diproses',
    className: 'bg-amber-100 text-amber-700 border border-amber-300'
  },
  COMPLETED: {
    label: 'Selesai',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-300'
  },
  CANCELLED: {
    label: 'Dibatalkan',
    className: 'bg-red-100 text-red-700 border border-red-300'
  }
};

const calculatePoTotal = (po: any) => {
  if (!po.items || !Array.isArray(po.items)) return 0;
  const subtotal = po.items.reduce((sum: number, item: any) => {
    const qty = item.qty || 0;
    const price = item.unitPrice || 0;
    const discount = item.discount || 0;
    return sum + qty * price * (1 - discount / 100);
  }, 0);
  const tax = po.taxPercent ? (subtotal * po.taxPercent) / 100 : 0;
  const shipping = po.shippingFee || 0;
  const loading = po.loadingFee || 0;
  const unloading = po.unloadingFee || 0;
  const additional = (po.additionalCosts || []).reduce(
    (acc: number, c: any) => acc + (c.amount || 0),
    0
  );
  return subtotal + tax + shipping + loading + unloading + additional;
};

export default function PurchasePage() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] =
    useState<RTUPurchase | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'requestDate', desc: true }
  ]);
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined'
      ? getLocalStorageSettings('rtu-purchase', 'activeTab', isString) ||
        'table'
      : 'table'
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    updateLocalStorageSettings('rtu-purchase', 'activeTab', val);
  };
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [selectedSellerValue, setSelectedSellerValue] = useState('');

  const { sellerVendorId, sellerOutletId } = useMemo(() => {
    if (
      !selectedSellerValue ||
      selectedSellerValue === 'all' ||
      selectedSellerValue === 'ALL'
    )
      return { sellerVendorId: undefined, sellerOutletId: undefined };
    const [type, id] = selectedSellerValue.split(':');
    return {
      sellerVendorId: type === 'vendor' ? id : undefined,
      sellerOutletId: type === 'seller' ? id : undefined
    };
  }, [selectedSellerValue]);

  const { hasPermission: canCreate } = useGetPermission('create', 'purchase');

  const { data: purchases = [], isLoading: isPurchasesLoading } =
    useGetRTUPurchases({
      buyerId: selectedOutletId || undefined,
      sellerId: sellerOutletId || undefined,
      vendorId: sellerVendorId || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined
    });

  // Ambil semua brand unik dari data purchases yang dimuat
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    purchases.forEach((po) => {
      po.items.forEach((item: any) => {
        const b = item.material?.brand;
        if (b && b.trim() !== '') {
          brandsSet.add(b.trim());
        }
      });
    });
    return Array.from(brandsSet).sort();
  }, [purchases]);

  const brandOptions = useMemo(() => {
    const options = [{ label: 'Semua Brand', value: 'ALL' }];
    availableBrands.forEach((brand) => {
      options.push({ label: brand, value: brand });
    });
    return options;
  }, [availableBrands]);

  const { data: grnsResponse } = useGetRTUGRNs();
  const grns = grnsResponse?.data || [];

  const { data: paymentsResponse } = useGetRTUPayments();
  const { data: invoicesResponse } = useGetRTUInvoiceReconciles();
  const invoices = invoicesResponse?.data || [];

  const completeMutation = useCompleteRTUPayment();
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);

  const handleComplete = async () => {
    if (confirmComplete) {
      await completeMutation.mutateAsync(confirmComplete);
      setConfirmComplete(null);
    }
  };

  const POsWithConfirmedInvoices = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv: any) => {
      if (inv.status === 'CONFIRMED' && inv.purchaseId) {
        set.add(inv.purchaseId);
      }
    });
    return set;
  }, [invoices]);

  const POsWithInvoices = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv: any) => {
      if (inv.status !== 'CANCELLED' && inv.purchaseId) {
        set.add(inv.purchaseId);
      }
    });
    return set;
  }, [invoices]);

  // Map purchaseId → total aktual dari semua confirmed invoice (dijumlahkan jika multi)
  const poInvoiceTotals = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      if (inv.status === 'CONFIRMED' && inv.purchaseId) {
        map[inv.purchaseId] =
          (map[inv.purchaseId] || 0) + (inv.totalAmount || 0);
      }
    });
    return map;
  }, [invoices]);

  // Helper: gunakan total dari invoice reconcile jika ada, fallback ke kalkulasi PO
  const getEffectiveTotal = (po: any): number => {
    return poInvoiceTotals[po._id] ?? calculatePoTotal(po);
  };

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

  const showLoading = isPurchasesLoading && purchases.length === 0;

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

  const filteredPurchasesForTable = useMemo(
    () =>
      purchases.filter((item: RTUPurchase) => {
        const dateStr = item.requestDate || item.createdAt;
        if (!dateStr) return false;
        if (dayjs(dateStr).format('YYYY-MM') !== selectedMonth) return false;

        if (sellerVendorId && item.vendor?._id !== sellerVendorId) {
          return false;
        }

        if (sellerOutletId && item.seller?._id !== sellerOutletId) {
          return false;
        }

        if (statusFilter && item.status !== statusFilter) {
          return false;
        }

        // Exclude CANCELLED if 'Semua Status' is selected
        if (
          (!statusFilter || statusFilter === 'ALL') &&
          item.status === 'CANCELLED'
        ) {
          return false;
        }

        if (brandFilter && brandFilter !== 'ALL') {
          const hasBrand = item.items.some(
            (it: any) => it.material?.brand === brandFilter
          );
          if (!hasBrand) return false;
        }

        return true;
      }),
    [
      purchases,
      selectedMonth,
      statusFilter,
      sellerVendorId,
      sellerOutletId,
      brandFilter
    ]
  );

  const cardStats = useMemo(() => {
    let totalPoAmount = 0;
    let totalPaidAmount = 0;
    let totalUnpaidAmount = 0;
    let activePoCount = 0;
    let totalPoCount = 0;

    filteredPurchasesForTable.forEach((po: RTUPurchase) => {
      if (po.status === 'CANCELLED') return;

      const total = getEffectiveTotal(po);
      const paid = paidAmounts[po._id] || 0;
      const unpaid = Math.max(0, total - paid);

      totalPoAmount += total;
      totalPaidAmount += paid;
      totalUnpaidAmount += unpaid;
      totalPoCount++;

      if (po.status === 'DRAFT' || po.status === 'PROCESSING') {
        activePoCount++;
      }
    });

    return {
      totalPoAmount,
      totalPaidAmount,
      totalUnpaidAmount,
      activePoCount,
      totalPoCount
    };
  }, [filteredPurchasesForTable, paidAmounts, poInvoiceTotals]);

  const columns = useMemo(
    () => [
      {
        header: '#',
        id: 'index',
        cell: (info: any) => (
          <div className="flex items-center justify-center py-1 min-h-[20px]">
            <span className="text-[11px] text-gray-500 font-medium">
              {info.row.index + 1}
            </span>
          </div>
        ),
        size: 15,
        sticky: 'left' as const
      },
      {
        header: 'Tgl. Request',
        accessorKey: 'requestDate',
        cell: (info: any) => (
          <div className="flex items-center py-1 min-h-[20px]">
            <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">
              {setDateStr(info.getValue(), 'DD MMM YYYY')}
            </span>
          </div>
        )
      },
      {
        header: 'No. Dokumen',
        accessorKey: 'docNumber',
        cell: (info: any) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2 py-1 min-h-[20px]">
              <span className="font-mono text-[11px] font-bold text-gray-700 whitespace-nowrap">
                {info.getValue()}
              </span>
              {row.isLoan && (
                <span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                  TITIPAN
                </span>
              )}
            </div>
          );
        }
      },
      {
        header: 'Tipe',
        accessorKey: 'type',
        align: 'center' as const,
        cell: (info: any) => {
          const val = info.getValue();
          return (
            <div className="flex justify-center items-center py-1 min-h-[20px] w-full">
              <Badge
                variant="outline"
                className={`rounded-sm font-bold text-[9px] px-1.5 py-0 ${
                  val === 'PRODUCT'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {val === 'PRODUCT' ? 'PRODUK JADI' : 'BAHAN BAKU'}
              </Badge>
            </div>
          );
        }
      },
      {
        header: 'Pembeli',
        accessorKey: 'buyer',
        cell: (info: any) => {
          const buyer = info.getValue();
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <span className="text-[11px] font-bold text-gray-800">
                {buyer?.label || '-'}
              </span>
            </div>
          );
        }
      },
      {
        header: 'Penjual',
        accessorKey: 'seller',
        cell: (info: any) => {
          const row = info.row.original as RTUPurchase;
          const seller = row.seller;
          const vendor = row.vendor;
          const name = seller?.name || vendor?.name || '-';
          const sub = seller
            ? seller.label
            : vendor
              ? `Vendor • ${vendor.code}`
              : '';
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <span
                className="font-bold text-[11px] text-gray-800 cursor-help border-b"
                title={sub}
              >
                {name}
              </span>
            </div>
          );
        }
      },
      {
        header: 'Items',
        accessorKey: 'items',
        cell: (info: any) => {
          const items = info.getValue() as any[];
          if (!items || items.length === 0)
            return <span className="text-[11px] text-gray-500">-</span>;
          return (
            <div className="flex flex-col gap-1 py-1">
              {items.map((item, idx) => {
                const name =
                  item.material?.name || item.product?.name || 'Unknown Item';
                const sub = item.material?.code ? item.material.code : '';
                return (
                  <div
                    key={idx}
                    className="flex items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                  >
                    <span
                      className="font-bold text-[11px] text-gray-800 leading-none cursor-help border-b"
                      title={sub}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      },
      {
        header: 'Brand',
        id: 'brand',
        cell: (info: any) => {
          const items = info.row.original.items as any[];
          if (!items || items.length === 0)
            return <span className="text-[11px] text-gray-500">-</span>;
          return (
            <div className="flex flex-col gap-1 py-1">
              {items.map((item, idx) => {
                const brand = item.material?.brand || '-';
                return (
                  <div
                    key={idx}
                    className="flex items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                  >
                    <span className="text-gray-600 font-medium whitespace-nowrap">
                      {brand}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      },
      {
        header: 'Qty (PO / Terima)',
        id: 'qtySummary',
        align: 'right' as const,
        cell: (info: any) => {
          const items = info.row.original.items as any[];
          if (!items || items.length === 0)
            return <span className="text-[11px] text-gray-500">-</span>;
          return (
            <div className="flex flex-col gap-1 py-1">
              {items.map((item, idx) => {
                const received = getReceivedQty(
                  info.row.original._id,
                  item.materialId,
                  item.productId
                );
                const isFullyReceived = received >= item.qty && item.qty > 0;
                const isPartiallyReceived = received > 0 && received < item.qty;

                return (
                  <div
                    key={idx}
                    className="flex justify-end items-center text-[11px] border-b border-gray-100 last:border-0 pb-1 last:pb-0 min-h-[20px]"
                  >
                    <span className="whitespace-nowrap font-mono text-[11px]">
                      <span className="font-bold text-gray-900">
                        {item.qty}
                      </span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span
                        className={
                          isFullyReceived
                            ? 'font-bold text-emerald-600'
                            : isPartiallyReceived
                              ? 'font-bold text-amber-600'
                              : 'text-gray-400'
                        }
                      >
                        {received}
                      </span>
                      <span className="text-[9px] text-gray-500 ml-1 font-sans font-medium">
                        {item.unit}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      },
      {
        header: 'Dokumen Terkait',
        id: 'documentProgress',
        align: 'center' as const,
        cell: (info: any) => {
          const row = info.row.original as RTUPurchase;
          const qtyPo =
            row.items?.reduce(
              (acc: number, curr: any) => acc + (curr.qty || 0),
              0
            ) || 0;
          const qtyReceived =
            row.items?.reduce((acc: number, curr: any) => {
              return (
                acc + getReceivedQty(row._id, curr.materialId, curr.productId)
              );
            }, 0) || 0;

          // GRN status calculation
          const poGrns = grns.filter(
            (g: any) => g.purchaseId === row._id && g.status !== 'CANCELLED'
          );
          const hasConfirmedGrn = poGrns.some(
            (g: any) => g.status === 'CONFIRMED'
          );
          const hasDraftGrn = poGrns.some((g: any) => g.status === 'DRAFT');

          let grnStatus: 'COMPLETED' | 'PARTIAL' | 'DRAFT' | 'NONE' = 'NONE';
          if (qtyPo > 0 && qtyReceived >= qtyPo && hasConfirmedGrn) {
            grnStatus = 'COMPLETED';
          } else if (qtyReceived > 0 || hasConfirmedGrn) {
            grnStatus = 'PARTIAL';
          } else if (hasDraftGrn) {
            grnStatus = 'DRAFT';
          }

          const grnPct =
            qtyPo > 0 ? Math.round((qtyReceived / qtyPo) * 100) : 0;
          const grnText =
            grnStatus === 'COMPLETED'
              ? '100%'
              : grnStatus === 'PARTIAL'
                ? `${grnPct}%`
                : undefined;

          // Invoice status calculation
          const poInvoices = invoices.filter(
            (inv: any) =>
              inv.purchaseId === row._id && inv.status !== 'CANCELLED'
          );
          let invoiceStatus: 'CONFIRMED' | 'DRAFT' | 'NONE' = 'NONE';
          if (poInvoices.some((inv: any) => inv.status === 'CONFIRMED')) {
            invoiceStatus = 'CONFIRMED';
          } else if (poInvoices.some((inv: any) => inv.status === 'DRAFT')) {
            invoiceStatus = 'DRAFT';
          }

          // Payment status calculation
          const total = getEffectiveTotal(row);
          const paid = paidAmounts[row._id] || 0;
          const draftPaid = draftPaidAmounts[row._id] || 0;

          let paymentStatus: 'PAID' | 'PARTIAL' | 'DRAFT' | 'UNPAID' = 'UNPAID';
          let paymentText: string | undefined = undefined;
          if (total > 0 && paid >= total) {
            paymentStatus = 'PAID';
            paymentText = 'Lunas';
          } else if (paid > 0) {
            paymentStatus = 'PARTIAL';
            paymentText = row.paymentType === 'DP' ? 'DP' : 'Sebagian';
          } else if (draftPaid > 0) {
            paymentStatus = 'DRAFT';
            paymentText = 'Draft';
          }

          return (
            <div className="flex justify-center items-center py-1 min-h-[20px] w-full">
              <DocumentLifecycleBadges
                grnStatus={grnStatus}
                grnText={grnText}
                invoiceStatus={invoiceStatus}
                paymentStatus={paymentStatus}
                paymentText={paymentText}
              />
            </div>
          );
        }
      },
      {
        header: 'Total & Terbayar',
        id: 'financialSummary',
        align: 'right' as const,
        cell: (info: any) => {
          const row = info.row.original;
          const total = getEffectiveTotal(row);
          const paid = paidAmounts[row._id] || 0;
          const isLunas = total > 0 && paid >= total;
          const sisa = Math.max(0, total - paid);

          return (
            <div className="flex flex-col items-end justify-center py-1 min-h-[20px] w-full">
              <span className="font-bold text-gray-900 text-[11px] whitespace-nowrap">
                {toIDR(total)}
              </span>
              {paid > 0 ? (
                <span
                  className={`text-[9px] font-bold whitespace-nowrap ${
                    isLunas ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                  title={
                    isLunas
                      ? 'Lunas 100%'
                      : `Terbayar: ${toIDR(paid)} (Sisa: ${toIDR(sisa)})`
                  }
                >
                  {isLunas ? 'Terbayar: Lunas' : `Bayar: ${toIDR(paid)}`}
                </span>
              ) : (
                <span className="text-[9px] text-gray-400 whitespace-nowrap">
                  Belum dibayar
                </span>
              )}
            </div>
          );
        }
      },
      {
        header: 'Catatan',
        accessorKey: 'notes',
        cell: (info: any) => {
          const notes = info.getValue() as string;
          return (
            <div className="flex items-center py-1 min-h-[20px] max-w-[120px]">
              <span
                className="text-[11px] text-gray-500 font-medium truncate"
                title={notes}
              >
                {notes || '-'}
              </span>
            </div>
          );
        },
        size: 110
      },
      {
        header: 'History',
        id: 'updateHistory',
        cell: (info: any) => {
          const item = info.row.original as RTUPurchase;
          return (
            <div className="flex items-center py-1 min-h-[20px]">
              <UpdateHistoryCell
                histories={item.histories}
                creator={item.creator}
                createdAt={item.createdAt}
              />
            </div>
          );
        }
      }
    ],
    [
      paidAmounts,
      draftPaidAmounts,
      POsWithConfirmedInvoices,
      grns,
      invoices,
      poInvoiceTotals
    ]
  );

  const handleExport = () => {
    const exportData = (purchases as RTUPurchase[]).map((p) => ({
      'No. Dokumen': p.docNumber,
      Tipe: p.type,
      Pembeli: p.buyer?.name || p.buyerId,
      Penjual: p.seller?.name || p.sellerId,
      Catatan: p.notes,
      Status: p.status,
      'Jml. Item': p.items.length,
      'Tgl. Request': setDateStr(p.requestDate, 'DD MMM YYYY HH:mm:ss')
    }));
    exportToExcel(
      exportData,
      `RTU_Purchase_${new Date().toISOString().split('T')[0]}`,
      'Purchase Orders'
    );
  };

  const renderPurchaseActions = useCallback((item: RTUPurchase) => {
    return (
      <div className="flex items-center justify-start gap-1 py-0">
        {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
          <EditPurchaseDialog purchase={item} />
        )}
        <Button
          variant="ghost"
          size="icon"
          icon={Eye}
          className="h-8 w-8 p-0 rounded-sm hover:bg-gray-200 text-gray-600 animate-none transition-colors"
          type="button"
          title="Lihat Detail PO"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPurchaseDetails(item);
          }}
        />
      </div>
    );
  }, []);

  return (
    <DashboardLayout>
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
              Purchase Order
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola pembelian stok produk jadi &amp; bahan baku secara
              real-time dengan tracking FIFO.
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            {canCreate && (
              <AddPurchaseDialog buyerOutletId={selectedOutletId} />
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-64"
            label="Cabang (Pembeli)"
            autoSelectFirst={true}
            save={true}
            saveKey="outletId"
          />
          <OutletSelector
            value={selectedSellerValue}
            onSelect={setSelectedSellerValue}
            className="w-full md:w-64"
            label="Penjual / Vendor"
            placeholder="Semua Penjual / Vendor..."
            autoSelectFirst={false}
            allowAll={true}
            includeVendors={true}
            save={true}
            saveKey="selectedSellerValue"
          />
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            save={true}
            saveKey="selectedMonth"
            useLabelComponent
          />

          <div className="space-y-1 w-full md:w-44">
            <ReusableSelect
              label="Status PO"
              value={statusFilter || 'ALL'}
              onChange={(v) => setStatusFilter(v === 'ALL' ? '' : String(v))}
              options={[
                { label: 'Semua Status (Aktif)', value: 'ALL' },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Diproses', value: 'PROCESSING' },
                { label: 'Selesai', value: 'COMPLETED' },
                { label: 'Dibatalkan', value: 'CANCELLED' }
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="statusFilter"
            />
          </div>
          <div className="space-y-1 w-full md:w-44">
            <ReusableSelect
              label="Tipe Item"
              value={typeFilter || 'ALL'}
              onChange={(v) => setTypeFilter(v === 'ALL' ? '' : String(v))}
              options={[
                { label: 'Semua Tipe', value: 'ALL' },
                { label: 'Produk Jadi', value: 'PRODUCT' },
                { label: 'Bahan Baku', value: 'MATERIAL' }
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="typeFilter"
            />
          </div>
          <div className="space-y-1 w-full md:w-48">
            <ReusableSelect
              label="Brand"
              icon={Award}
              value={brandFilter || 'ALL'}
              onChange={(v) => setBrandFilter(v === 'ALL' ? '' : String(v))}
              options={brandOptions}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={true}
              save={true}
              saveKey="brandFilter"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CountCard
            title="Total Purchase Order"
            value={toIDR(cardStats.totalPoAmount)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={ShoppingCart}
            iconClassName="text-blue-600 bg-blue-50"
          />
          <CountCard
            title="Total Terbayar"
            value={toIDR(cardStats.totalPaidAmount)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CreditCard}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            title="Sisa Tagihan PO"
            value={toIDR(cardStats.totalUnpaidAmount)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CreditCard}
            iconClassName="text-amber-600 bg-amber-50"
          />
          <CountCard
            title="PO Dalam Proses"
            value={cardStats.activePoCount}
            subValue={`/ ${cardStats.totalPoCount} PO`}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={ShoppingCart}
            iconClassName="text-indigo-600 bg-indigo-50"
          />
        </div>

        <ReusableTabs
          value={activeTab}
          onValueChange={handleTabChange}
          tabs={[
            { value: 'list', label: 'List View', icon: List },
            { value: 'table', label: 'Table', icon: TableIcon }
          ]}
          variant="emerald"
          widthClass="md:w-[400px]"
        />

        {activeTab === 'list' && (
          <div className="space-y-6 mt-4">
            <TableData
              data={filteredPurchasesForTable}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              isLoading={showLoading}
              renderActions={renderPurchaseActions}
              actionsColumnSize={80}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-6 mt-4">
            <PurchaseTable
              purchases={filteredPurchasesForTable}
              grns={grns}
              isLoading={showLoading}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              selectedMonth={selectedMonth}
              statusFilter={statusFilter}
            />
          </div>
        )}
      </div>
      <ConfirmationDialog
        open={!!confirmComplete}
        onOpenChange={(v) => !v && setConfirmComplete(null)}
        onConfirm={handleComplete}
        title="Konfirmasi Pembayaran"
        description="Apakah Anda yakin ingin mengkonfirmasi pembayaran ini? Mengonfirmasi pembayaran menandakan bahwa transaksi pembayaran sudah selesai/dilakukan. Tindakan ini tidak dapat dibatalkan."
        isLoading={completeMutation.isPending}
      />
      {selectedPurchaseDetails && (
        <PurchaseDetailsDialog
          purchase={
            purchases.find((p: any) => p._id === selectedPurchaseDetails._id) ||
            selectedPurchaseDetails
          }
          open={!!selectedPurchaseDetails}
          onOpenChange={(v) => !v && setSelectedPurchaseDetails(null)}
          onClose={() => setSelectedPurchaseDetails(null)}
        />
      )}
    </DashboardLayout>
  );
}
