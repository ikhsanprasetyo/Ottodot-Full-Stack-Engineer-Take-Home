'use client';

import { useState, useMemo, useEffect, Fragment, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/ui/form-input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DatePicker } from '@/components/ui/date-picker';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import {
  useCreateRTUPayment,
  useGetRTUPayments
} from '@/lib/hooks/queries/rtu-payment';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { BankAccounts } from '@/components/ui/bank-accounts';
import { Package, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { toIDR } from '@/lib/utils';

const schema = z.object({
  buyerId: z.string().min(1, 'Outlet wajib dipilih'),
  paymentDate: z.string().min(1, 'Tanggal wajib diisi'),
  targetType: z.enum(['VENDOR', 'SELLER']),
  targetId: z.string().min(1, 'Tujuan wajib dipilih'),
  method: z.enum(['CASH', 'TRANSFER', 'GIRO']),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

type PaymentRow = {
  purchaseId: string;
  amount: number;
  maxAmount: number;
  docNumber?: string;
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

export function AddPaymentDialog({
  open,
  onOpenChange,
  prefilledPurchase
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefilledPurchase?: any;
}) {
  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      buyerId: getUserFromStorage()?.outlet || '',
      paymentDate: new Date().toISOString(),
      targetType: 'VENDOR',
      targetId: '',
      method: 'TRANSFER',
      bankName: '',
      bankAccount: '',
      notes: ''
    }
  });

  const [rows, setRows] = useState<PaymentRow[]>([
    { purchaseId: '', amount: 0, maxAmount: 0 }
  ]);
  const [rowError, setRowError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const { data: outlets } = useGetOutlets();
  const { data: vendors } = useGetRTUVendors();
  const { data: purchases } = useGetRTUPurchases();
  const { data: paymentsResponse } = useGetRTUPayments();
  const { data: invoicesResponse } = useGetRTUInvoiceReconciles();

  const paidAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    if (!paymentsResponse?.data) return map;

    paymentsResponse.data.forEach((p: any) => {
      if (p.status === 'CANCELLED') return;
      if (!p.details) return;

      p.details.forEach((det: any) => {
        if (!det.purchaseId) return;
        map[det.purchaseId] =
          (map[det.purchaseId] || 0) + (det.amountApplied || 0);
      });
    });

    return map;
  }, [paymentsResponse]);

  // Build map purchaseId → total aktual dari confirmed invoice
  // (bisa ada >1 invoice per PO jika multi-GRN, dijumlahkan)
  const poInvoiceTotals = useMemo(() => {
    const map: Record<string, number> = {};
    if (!invoicesResponse?.data) return map;
    invoicesResponse.data.forEach((inv: any) => {
      if (inv.status === 'CONFIRMED' && inv.purchaseId) {
        map[inv.purchaseId] =
          (map[inv.purchaseId] || 0) + (inv.totalAmount || 0);
      }
    });
    return map;
  }, [invoicesResponse]);

  // Helper: ambil total aktual dari invoice jika ada, fallback ke kalkulasi PO
  const getEffectiveTotal = useCallback(
    (po: any): number => {
      return poInvoiceTotals[po._id] ?? calculatePoTotal(po);
    },
    [poInvoiceTotals]
  );

  const createMutation = useCreateRTUPayment();

  useEffect(() => {
    if (open && prefilledPurchase) {
      const type = prefilledPurchase.vendorId ? 'VENDOR' : 'SELLER';
      const targetId =
        prefilledPurchase.vendorId || prefilledPurchase.sellerId || '';
      const total = getEffectiveTotal(prefilledPurchase);
      const paid = paidAmounts[prefilledPurchase._id] || 0;

      // DP unpaid = status PROCESSING, paymentType DP, DP belum lunas
      const isDpUnpaid =
        prefilledPurchase.status === 'PROCESSING' &&
        prefilledPurchase.paymentType === 'DP' &&
        prefilledPurchase.dpAmount > 0 &&
        paid < prefilledPurchase.dpAmount;

      const maxLimit = isDpUnpaid
        ? Math.max(0, prefilledPurchase.dpAmount - paid)
        : Math.max(0, total - paid);

      const prefillAmt =
        prefilledPurchase.prefillAmount !== undefined &&
        prefilledPurchase.prefillAmount > 0
          ? Math.min(prefilledPurchase.prefillAmount, maxLimit)
          : maxLimit;

      setValue('buyerId', prefilledPurchase.buyerId);
      setValue('targetType', type);
      setValue('targetId', targetId);
      setValue('notes', isDpUnpaid ? 'Down Payment' : '');
      setRows([
        {
          purchaseId: prefilledPurchase._id,
          amount: prefillAmt,
          maxAmount: maxLimit,
          docNumber: prefilledPurchase.docNumber
        }
      ]);
    } else if (open) {
      reset({
        buyerId: getUserFromStorage()?.outlet || '',
        paymentDate: new Date().toISOString(),
        targetType: 'VENDOR',
        targetId: '',
        method: 'TRANSFER',
        bankName: '',
        bankAccount: '',
        notes: ''
      });
      setRows([{ purchaseId: '', amount: 0, maxAmount: 0 }]);
    }
  }, [
    open,
    prefilledPurchase,
    setValue,
    reset,
    paidAmounts,
    getEffectiveTotal
  ]);

  const targetType = watch('targetType');
  const targetId = watch('targetId');
  const buyerId = watch('buyerId');

  const selectedVendor = useMemo(() => {
    if (targetType !== 'VENDOR' || !targetId) return null;
    return vendors?.data?.find((v: any) => v._id === targetId);
  }, [vendors, targetType, targetId]);

  const bankAccounts = useMemo(
    () => selectedVendor?.bankAccounts || [],
    [selectedVendor]
  );

  // Bank selection is handled directly via <BankAccounts> component in readOnly mode

  useEffect(() => {
    if (targetType === 'VENDOR' && selectedVendor) {
      const accounts = selectedVendor.bankAccounts || [];
      if (accounts.length > 0) {
        const defaultAcc =
          accounts.find((acc: any) => acc.isDefault) || accounts[0];
        setValue('bankName', defaultAcc.bankName);
        setValue('bankAccount', defaultAcc.accountNumber);
      } else {
        setValue('bankName', '');
        setValue('bankAccount', '');
      }
    } else {
      setValue('bankName', '');
      setValue('bankAccount', '');
    }
  }, [selectedVendor, targetType, setValue]);

  // Filter purchases that are eligible for payment:
  // 1. COMPLETED status with outstanding balance
  // 2. Has a confirmed invoice reconcile with outstanding balance
  // 3. PROCESSING + DP type with unpaid DP amount
  const unpaidPurchases = useMemo(() => {
    if (!purchases) return [];
    return purchases.filter((p: any) => {
      // Must match the selected buyer outlet
      const isBuyerMatch = p.buyerId === buyerId;

      // Match vendor/seller
      const isTargetMatch =
        targetType === 'VENDOR'
          ? p.vendorId === targetId
          : p.sellerId === targetId;

      const total = getEffectiveTotal(p);
      const paid = paidAmounts[p._id] || 0;

      // PO is eligible if it is active (COMPLETED or PROCESSING status) and has an outstanding balance
      const isValidStatus =
        (p.status === 'COMPLETED' || p.status === 'PROCESSING') && paid < total;

      return isBuyerMatch && isTargetMatch && isValidStatus;
    });
  }, [
    purchases,
    targetType,
    targetId,
    buyerId,
    paidAmounts,
    getEffectiveTotal
  ]);

  const addRow = () => {
    setRows((prev) => [...prev, { purchaseId: '', amount: 0, maxAmount: 0 }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePurchaseChange = (index: number, purchaseId: string) => {
    const po = unpaidPurchases.find((p: any) => p._id === purchaseId);
    if (po) {
      const paid = paidAmounts[po._id] || 0;
      const total = getEffectiveTotal(po);

      // DP unpaid = status PROCESSING, paymentType DP, DP belum lunas
      const isDpUnpaid =
        po.status === 'PROCESSING' &&
        po.paymentType === 'DP' &&
        po.dpAmount > 0 &&
        paid < po.dpAmount;

      const maxAmt = isDpUnpaid
        ? Math.max(0, po.dpAmount - paid)
        : Math.max(0, total - paid);

      setRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                purchaseId,
                amount: maxAmt,
                maxAmount: maxAmt,
                docNumber: po.docNumber
              }
            : row
        )
      );

      if (isDpUnpaid) {
        setValue('notes', 'Down Payment');
      }

      setExpandedRows((prev) => ({
        ...prev,
        [index]: true
      }));
    }
  };

  const handleAmountChange = (index: number, val: number) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, amount: val } : row))
    );
  };

  const totalPayment = rows.reduce((sum, row) => sum + (row.amount || 0), 0);

  const onSubmit = async (data: FormValues) => {
    if (rows.length === 0) {
      setRowError('Minimal 1 tagihan (PO) harus ditambahkan');
      return;
    }
    const invalidRow = rows.find((r) => !r.purchaseId || r.amount <= 0);
    if (invalidRow) {
      setRowError('Pastikan semua baris memilih PO dan nominal > 0');
      return;
    }
    const purchaseIds = rows.map((r) => r.purchaseId).filter(Boolean);
    const hasDuplicates = new Set(purchaseIds).size !== purchaseIds.length;
    if (hasDuplicates) {
      setRowError(
        'Ada nomor PO yang sama terpilih lebih dari sekali. Pastikan setiap baris memiliki nomor PO yang unik.'
      );
      return;
    }
    setRowError(null);

    const payload = {
      buyerId: data.buyerId,
      sellerId: data.targetType === 'SELLER' ? data.targetId : undefined,
      vendorId: data.targetType === 'VENDOR' ? data.targetId : undefined,
      paymentDate: new Date(data.paymentDate).toISOString(),
      method: data.method,
      bankName: data.method === 'TRANSFER' ? data.bankName : undefined,
      bankAccount: data.method === 'TRANSFER' ? data.bankAccount : undefined,
      notes: data.notes || '',
      details: rows.map((r) => ({
        purchaseId: r.purchaseId,
        amountApplied: r.amount,
        notes: ''
      }))
    };

    try {
      await createMutation.mutateAsync(payload);
      reset();
      setRows([{ purchaseId: '', amount: 0, maxAmount: 0 }]);
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Buat Pembayaran Baru</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden mt-4"
        >
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">
                  Bayar Dari (Outlet)
                </Label>
                <ReusableSelect
                  value={watch('buyerId')}
                  onChange={(v) => setValue('buyerId', v)}
                  options={
                    outlets?.data?.map((o: any) => ({
                      label: o.label,
                      value: o._id
                    })) || []
                  }
                  placeholder="Pilih Outlet"
                  showDefaultSelect={true}
                />
                {errors.buyerId && (
                  <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
                    {errors.buyerId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <DatePicker
                  value={watch('paymentDate')}
                  onChange={(d) => d && setValue('paymentDate', d)}
                  label="Tanggal Pembayaran"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">
                  Tujuan Pembayaran
                </Label>
                <ReusableSelect
                  value={watch('targetType')}
                  onChange={(v: any) => {
                    setValue('targetType', v);
                    setValue('targetId', '');
                    setRows([{ purchaseId: '', amount: 0, maxAmount: 0 }]);
                  }}
                  options={[
                    { label: 'Vendor Eksternal', value: 'VENDOR' },
                    { label: 'Outlet Internal', value: 'SELLER' }
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">
                  Pilih {targetType === 'VENDOR' ? 'Vendor' : 'Outlet'}
                </Label>
                <ReusableSelect
                  value={watch('targetId')}
                  onChange={(v) => {
                    const val = String(v);
                    setValue('targetId', val);
                    setRows([{ purchaseId: '', amount: 0, maxAmount: 0 }]);
                  }}
                  options={
                    targetType === 'VENDOR'
                      ? vendors?.data?.map((v: any) => ({
                          label: v.name,
                          value: v._id
                        })) || []
                      : outlets?.data?.map((o: any) => ({
                          label: o.name,
                          value: o._id
                        })) || []
                  }
                  placeholder={`Pilih ${targetType === 'VENDOR' ? 'Vendor' : 'Outlet'}`}
                  showDefaultSelect={true}
                />
                {errors.targetId && (
                  <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
                    {errors.targetId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">
                  Metode
                </Label>
                <ReusableSelect
                  value={watch('method')}
                  onChange={(v: any) => {
                    setValue('method', v);
                    if (v !== 'TRANSFER') {
                      setValue('bankName', '');
                      setValue('bankAccount', '');
                    }
                  }}
                  options={[
                    { label: 'Transfer Bank', value: 'TRANSFER' },
                    { label: 'Tunai (Cash)', value: 'CASH' }
                  ]}
                />
              </div>

              {watch('method') === 'TRANSFER' && targetType === 'VENDOR' && (
                <div className="col-span-2">
                  <BankAccounts
                    readOnly
                    value={bankAccounts}
                    selectedBankName={watch('bankName')}
                    selectedBankAccount={watch('bankAccount')}
                    onSelect={(bankName, bankAccount) => {
                      setValue('bankName', bankName, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                      setValue('bankAccount', bankAccount, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                    }}
                    size="sm"
                  />
                  {(errors.bankName || errors.bankAccount) && (
                    <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
                      {errors.bankName?.message ||
                        errors.bankAccount?.message ||
                        'Pilih salah satu rekening bank'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <FormInput
              label="Catatan"
              name="notes"
              value={watch('notes') || ''}
              onChange={(e: any) => setValue('notes', e.target.value)}
              placeholder="Opsional..."
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm italic">
                    Tagihan (PO) yang Dibayar
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-sm text-[10px] font-bold uppercase text-emerald-600 hover:bg-emerald-50 px-3 py-1"
                  onClick={addRow}
                >
                  + Tambah Baris
                </Button>
              </div>

              {rowError && (
                <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                  {rowError}
                </p>
              )}

              <div className="rounded-sm border border-gray-200 overflow-hidden shadow-sm bg-white">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-slate-900">
                    <TableRow className="h-10 border-none hover:bg-transparent">
                      <TableHead className="w-[40px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                        #
                      </TableHead>
                      <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold">
                        Pilih PO
                      </TableHead>
                      <TableHead className="w-[150px] text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Total Tagihan
                      </TableHead>
                      <TableHead className="w-[150px] text-white text-[11px] uppercase tracking-wider font-bold text-right">
                        Nominal Dibayar
                      </TableHead>
                      <TableHead className="w-[60px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-gray-500 text-sm"
                        >
                          Belum ada tagihan yang ditambahkan. Klik &quot;+
                          Tambah Baris&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => {
                        const selectedPo = unpaidPurchases.find(
                          (p: any) => p._id === row.purchaseId
                        );
                        const isExpanded = expandedRows[index] ?? true;

                        return (
                          <Fragment key={index}>
                            <TableRow className="group hover:bg-slate-50/50 transition-colors">
                              <TableCell className="text-center font-mono text-xs text-gray-500 align-top pt-3">
                                {index + 1}
                              </TableCell>

                              <TableCell className="align-top">
                                <ReusableSelect
                                  searchable={true}
                                  value={row.purchaseId}
                                  onChange={(v: string) =>
                                    handlePurchaseChange(index, v)
                                  }
                                  placeholder="Cari PO..."
                                  options={unpaidPurchases
                                    .filter((p: any) => {
                                      // Izinkan jika PO tersebut adalah yang sedang dipilih di baris ini
                                      if (p._id === row.purchaseId) return true;
                                      // Saring keluar PO yang sudah dipilih di baris lain
                                      return !rows.some(
                                        (r) => r.purchaseId === p._id
                                      );
                                    })
                                    .map((p: any) => ({
                                      label: `${p.docNumber} (${new Date(p.requestDate).toLocaleDateString('id-ID')})`,
                                      value: p._id
                                    }))}
                                  triggerClassName="text-xs h-9"
                                />
                                {row.purchaseId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [index]: !prev[index]
                                      }))
                                    }
                                    className="mt-1 text-[9px] text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                  >
                                    {isExpanded
                                      ? 'Sembunyikan Preview'
                                      : '🔍 Preview Item PO'}
                                  </button>
                                )}
                              </TableCell>

                              <TableCell className="text-right font-bold text-sm text-gray-800 align-top pt-3">
                                {toIDR(row.maxAmount)}
                              </TableCell>

                              <TableCell className="align-top">
                                <FormInput
                                  type="currency"
                                  name={`rows.${index}.amount`}
                                  value={row.amount === 0 ? '' : row.amount}
                                  onChange={(e: any) => {
                                    const val = e.target.value;
                                    handleAmountChange(
                                      index,
                                      val === '' ? 0 : Number(val)
                                    );
                                  }}
                                  className="h-9 text-sm rounded-sm border-gray-200 bg-white text-right font-bold text-indigo-700"
                                  containerClassName="mb-0"
                                />
                              </TableCell>

                              <TableCell className="text-center align-top">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRow(index)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isExpanded &&
                              selectedPo &&
                              (() => {
                                // Ambil semua confirmed invoice untuk PO ini
                                const confirmedInvoices =
                                  invoicesResponse?.data?.filter(
                                    (inv: any) =>
                                      inv.status === 'CONFIRMED' &&
                                      inv.purchaseId === selectedPo._id
                                  ) || [];

                                const hasInvoice = confirmedInvoices.length > 0;

                                // Hitung grand total dari invoice (sudah include tax per invoice)
                                const invoiceGrandTotal =
                                  confirmedInvoices.reduce(
                                    (sum: number, inv: any) =>
                                      sum + (inv.totalAmount || 0),
                                    0
                                  );

                                // Fallback ke PO items jika tidak ada invoice
                                const poSubtotal =
                                  selectedPo.items?.reduce(
                                    (sum: number, i: any) => {
                                      return (
                                        sum +
                                        (i.qty || 0) *
                                          (i.unitPrice || 0) *
                                          (1 - (i.discount || 0) / 100)
                                      );
                                    },
                                    0
                                  ) || 0;
                                const poTax =
                                  (poSubtotal * (selectedPo.taxPercent || 0)) /
                                  100;
                                const poShipping = selectedPo.shippingFee || 0;
                                const poLoading = selectedPo.loadingFee || 0;
                                const poUnloading =
                                  selectedPo.unloadingFee || 0;
                                const poCustom = (
                                  selectedPo.additionalCosts || []
                                ).reduce(
                                  (acc: number, c: any) =>
                                    acc + (c.amount || 0),
                                  0
                                );
                                const poGrandTotal =
                                  poSubtotal +
                                  poTax +
                                  poShipping +
                                  poLoading +
                                  poUnloading +
                                  poCustom;

                                const paid = paidAmounts[selectedPo._id] || 0;
                                const total = hasInvoice
                                  ? invoiceGrandTotal
                                  : poGrandTotal;
                                const remaining = Math.max(0, total - paid);
                                const isDpPo =
                                  selectedPo.paymentType === 'DP' &&
                                  selectedPo.dpAmount > 0;

                                return (
                                  <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-none">
                                    <TableCell
                                      colSpan={5}
                                      className="p-3 border-t border-gray-100"
                                    >
                                      <div className="bg-white rounded-sm border border-gray-200/80 p-3 shadow-inner space-y-3">
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider pb-1.5 border-b border-gray-100">
                                          <span>
                                            {hasInvoice
                                              ? 'Detail Invoice Reconcile'
                                              : 'Detail Item PO'}{' '}
                                            (No. PO: {selectedPo.docNumber})
                                          </span>
                                          <span>
                                            Vendor:{' '}
                                            {selectedPo.vendor?.name ||
                                              selectedPo.seller?.name ||
                                              '-'}
                                          </span>
                                          <span>
                                            Tanggal PO:{' '}
                                            {new Date(
                                              selectedPo.requestDate
                                            ).toLocaleDateString('id-ID')}
                                          </span>
                                        </div>

                                        {hasInvoice ? (
                                          /* Render dari invoice reconcile */
                                          <div className="space-y-3">
                                            {confirmedInvoices.map(
                                              (inv: any, invIdx: number) => {
                                                const invSubtotal =
                                                  inv.items?.reduce(
                                                    (sum: number, it: any) =>
                                                      sum +
                                                      (it.qtyInvoiced || 0) *
                                                        (it.unitPrice || 0) *
                                                        (1 -
                                                          (it.discount || 0) /
                                                            100),
                                                    0
                                                  ) || 0;
                                                const invTax =
                                                  (invSubtotal *
                                                    (inv.taxPercent || 0)) /
                                                  100;
                                                const invTotal =
                                                  invSubtotal + invTax;

                                                return (
                                                  <div key={invIdx}>
                                                    {confirmedInvoices.length >
                                                      1 && (
                                                      <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                                                        Invoice:{' '}
                                                        {inv.invoiceNumber}
                                                      </div>
                                                    )}
                                                    <div className="max-h-[150px] overflow-y-auto pr-1">
                                                      <table className="w-full text-xs text-left">
                                                        <thead>
                                                          <tr className="text-gray-500 font-semibold border-b border-gray-100">
                                                            <th className="py-1">
                                                              Nama Barang
                                                            </th>
                                                            <th className="py-1 text-center w-[80px]">
                                                              Qty Aktual
                                                            </th>
                                                            <th className="py-1 text-right w-[110px]">
                                                              Harga Satuan
                                                            </th>
                                                            <th className="py-1 text-center w-[60px]">
                                                              Diskon
                                                            </th>
                                                            <th className="py-1 text-right w-[100px]">
                                                              Total
                                                            </th>
                                                          </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                          {inv.items?.map(
                                                            (
                                                              item: any,
                                                              itemIdx: number
                                                            ) => {
                                                              const subtotal =
                                                                (item.qtyInvoiced ||
                                                                  0) *
                                                                (item.unitPrice ||
                                                                  0) *
                                                                (1 -
                                                                  (item.discount ||
                                                                    0) /
                                                                    100);
                                                              return (
                                                                <tr
                                                                  key={itemIdx}
                                                                  className="text-gray-700"
                                                                >
                                                                  <td className="py-1.5 font-medium">
                                                                    {item
                                                                      .material
                                                                      ?.name ||
                                                                      item.itemName ||
                                                                      'Barang Tanpa Nama'}
                                                                    {item
                                                                      .material
                                                                      ?.brand && (
                                                                      <span className="text-gray-500 font-normal ml-1">
                                                                        (
                                                                        {
                                                                          item
                                                                            .material
                                                                            .brand
                                                                        }
                                                                        )
                                                                      </span>
                                                                    )}
                                                                  </td>
                                                                  <td className="py-1.5 text-center font-mono">
                                                                    {
                                                                      item.qtyInvoiced
                                                                    }{' '}
                                                                    {item.unit ||
                                                                      'pcs'}
                                                                  </td>
                                                                  <td className="py-1.5 text-right font-mono">
                                                                    {toIDR(
                                                                      item.unitPrice
                                                                    )}
                                                                  </td>
                                                                  <td className="py-1.5 text-center font-mono">
                                                                    {item.discount ||
                                                                      0}
                                                                    %
                                                                  </td>
                                                                  <td className="py-1.5 text-right font-mono font-semibold">
                                                                    {toIDR(
                                                                      subtotal
                                                                    )}
                                                                  </td>
                                                                </tr>
                                                              );
                                                            }
                                                          )}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                    {/* Summary per invoice */}
                                                    <div className="flex flex-col items-end gap-0.5 text-[11px] border-t border-gray-100 pt-1.5 text-gray-600">
                                                      <div className="flex justify-between w-52">
                                                        <span>Subtotal:</span>
                                                        <span className="font-mono font-semibold">
                                                          {toIDR(invSubtotal)}
                                                        </span>
                                                      </div>
                                                      {invTax > 0 && (
                                                        <div className="flex justify-between w-52">
                                                          <span>
                                                            PPN (
                                                            {inv.taxPercent}%):
                                                          </span>
                                                          <span className="font-mono font-semibold">
                                                            {toIDR(invTax)}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {(inv.shippingFee || 0) >
                                                        0 && (
                                                        <div className="flex justify-between w-52">
                                                          <span>
                                                            Ongkos Kirim:
                                                          </span>
                                                          <span className="font-mono font-semibold">
                                                            {toIDR(
                                                              inv.shippingFee
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {(inv.loadingFee || 0) >
                                                        0 && (
                                                        <div className="flex justify-between w-52">
                                                          <span>
                                                            Biaya Muat:
                                                          </span>
                                                          <span className="font-mono font-semibold">
                                                            {toIDR(
                                                              inv.loadingFee
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {(inv.unloadingFee || 0) >
                                                        0 && (
                                                        <div className="flex justify-between w-52">
                                                          <span>
                                                            Biaya Bongkar:
                                                          </span>
                                                          <span className="font-mono font-semibold">
                                                            {toIDR(
                                                              inv.unloadingFee
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {(
                                                        inv.additionalCosts ||
                                                        []
                                                      ).map(
                                                        (
                                                          c: any,
                                                          cIdx: number
                                                        ) => (
                                                          <div
                                                            key={cIdx}
                                                            className="flex justify-between w-52"
                                                          >
                                                            <span>
                                                              {c.name ||
                                                                'Biaya Lain'}
                                                              :
                                                            </span>
                                                            <span className="font-mono font-semibold">
                                                              {toIDR(c.amount)}
                                                            </span>
                                                          </div>
                                                        )
                                                      )}
                                                      <div className="flex justify-between w-52 font-bold text-gray-800 border-t border-gray-100 pt-1">
                                                        <span>
                                                          Total Invoice:
                                                        </span>
                                                        <span className="font-mono">
                                                          {toIDR(invTotal)}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              }
                                            )}

                                            {/* Grand total jika >1 invoice */}
                                            {confirmedInvoices.length > 1 && (
                                              <div className="flex flex-col items-end gap-0.5 text-[11px] border-t-2 border-indigo-100 pt-2 text-gray-800">
                                                <div className="flex justify-between w-52 font-bold text-indigo-700 text-xs">
                                                  <span>
                                                    Grand Total Tagihan:
                                                  </span>
                                                  <span className="font-mono">
                                                    {toIDR(invoiceGrandTotal)}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          /* Fallback: render dari PO items jika belum ada invoice */
                                          <>
                                            <div className="max-h-[150px] overflow-y-auto pr-1">
                                              <table className="w-full text-xs text-left">
                                                <thead>
                                                  <tr className="text-gray-500 font-semibold border-b border-gray-100">
                                                    <th className="py-1">
                                                      Nama Barang
                                                    </th>
                                                    <th className="py-1 text-center w-[60px]">
                                                      Jumlah
                                                    </th>
                                                    <th className="py-1 text-right w-[100px]">
                                                      Harga Satuan
                                                    </th>
                                                    <th className="py-1 text-center w-[70px]">
                                                      Diskon
                                                    </th>
                                                    <th className="py-1 text-center w-[60px]">
                                                      PPN
                                                    </th>
                                                    <th className="py-1 text-right w-[100px]">
                                                      Total
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                  {selectedPo.items?.map(
                                                    (
                                                      item: any,
                                                      itemIdx: number
                                                    ) => {
                                                      const subtotal =
                                                        (item.qty || 0) *
                                                        (item.unitPrice || 0) *
                                                        (1 -
                                                          (item.discount || 0) /
                                                            100);
                                                      return (
                                                        <tr
                                                          key={itemIdx}
                                                          className="text-gray-700"
                                                        >
                                                          <td className="py-1.5 font-medium">
                                                            {item.itemName ||
                                                              item.product
                                                                ?.name ||
                                                              item.material
                                                                ?.name ||
                                                              'Barang Tanpa Nama'}
                                                          </td>
                                                          <td className="py-1.5 text-center font-mono">
                                                            {item.qty}{' '}
                                                            {item.unit || 'pcs'}
                                                          </td>
                                                          <td className="py-1.5 text-right font-mono">
                                                            {toIDR(
                                                              item.unitPrice
                                                            )}
                                                          </td>
                                                          <td className="py-1.5 text-center font-mono">
                                                            {item.discount || 0}
                                                            %
                                                          </td>
                                                          <td className="py-1.5 text-center font-mono">
                                                            {selectedPo.taxPercent ||
                                                              0}
                                                            %
                                                          </td>
                                                          <td className="py-1.5 text-right font-mono font-semibold">
                                                            {toIDR(subtotal)}
                                                          </td>
                                                        </tr>
                                                      );
                                                    }
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 text-[11px] border-t border-gray-100 pt-2 text-gray-600">
                                              <div className="flex justify-between w-48">
                                                <span>Subtotal PO:</span>
                                                <span className="font-mono font-semibold">
                                                  {toIDR(poSubtotal)}
                                                </span>
                                              </div>
                                              {poTax > 0 && (
                                                <div className="flex justify-between w-48">
                                                  <span>
                                                    PPN ({selectedPo.taxPercent}
                                                    %):
                                                  </span>
                                                  <span className="font-mono font-semibold">
                                                    {toIDR(poTax)}
                                                  </span>
                                                </div>
                                              )}
                                              {poShipping > 0 && (
                                                <div className="flex justify-between w-48">
                                                  <span>Ongkos Kirim:</span>
                                                  <span className="font-mono font-semibold">
                                                    {toIDR(poShipping)}
                                                  </span>
                                                </div>
                                              )}
                                              {poLoading > 0 && (
                                                <div className="flex justify-between w-48">
                                                  <span>Biaya Muat:</span>
                                                  <span className="font-mono font-semibold">
                                                    {toIDR(poLoading)}
                                                  </span>
                                                </div>
                                              )}
                                              {poUnloading > 0 && (
                                                <div className="flex justify-between w-48">
                                                  <span>Biaya Bongkar:</span>
                                                  <span className="font-mono font-semibold">
                                                    {toIDR(poUnloading)}
                                                  </span>
                                                </div>
                                              )}
                                              {(
                                                selectedPo.additionalCosts || []
                                              ).map((c: any, cIdx: number) => (
                                                <div
                                                  key={cIdx}
                                                  className="flex justify-between w-48"
                                                >
                                                  <span>
                                                    {c.name || 'Biaya Lain'}:
                                                  </span>
                                                  <span className="font-mono font-semibold">
                                                    {toIDR(c.amount)}
                                                  </span>
                                                </div>
                                              ))}
                                              <div className="flex justify-between w-48 font-bold text-gray-800 border-t border-gray-50 pt-1 text-xs">
                                                <span>Total PO:</span>
                                                <span className="font-mono">
                                                  {toIDR(poGrandTotal)}
                                                </span>
                                              </div>
                                            </div>
                                          </>
                                        )}

                                        <div className="border-t border-dashed border-gray-200 pt-3 mt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 p-2.5 rounded-sm">
                                          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] text-gray-600 font-medium">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                              <span>Total PO:</span>
                                              <span className="font-bold text-gray-800">
                                                {toIDR(total)}
                                              </span>
                                            </div>
                                            {isDpPo && (
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                <span>Kewajiban DP:</span>
                                                <span className="font-bold text-amber-700">
                                                  {toIDR(selectedPo.dpAmount)}
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                              <span>Sudah Dibayar:</span>
                                              <span className="font-bold text-emerald-700">
                                                {toIDR(paid)}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 border-l-0 md:border-l border-gray-200 pl-0 md:pl-4">
                                            <span>Sisa Hutang:</span>
                                            <span className="font-mono text-sm">
                                              {toIDR(remaining)}
                                            </span>
                                          </div>
                                        </div>

                                        {selectedPo.notes && (
                                          <div className="text-[10px] text-gray-500 italic mt-2 border-t border-gray-100 pt-1.5 flex gap-1">
                                            <span className="font-bold">
                                              Catatan PO:
                                            </span>
                                            <span>
                                              &quot;{selectedPo.notes}&quot;
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })()}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {totalPayment > 0 && (
            <div className="mt-4 p-4 bg-indigo-600 rounded-sm text-white flex justify-between items-center shadow-md flex-shrink-0">
              <div className="font-medium text-sm">Total Pembayaran:</div>
              <div className="text-xl font-bold">{toIDR(totalPayment)}</div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              variant="primary"
            >
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
