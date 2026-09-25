'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Trash2,
  Store,
  Layers,
  Package,
  Box,
  Building2,
  StickyNote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/components/ui/form-input';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { ButtonToggle } from '@/components/ui/button-toggle';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import {
  useCreateRTUPurchase,
  useCancelRTUPurchase
} from '@/lib/hooks/queries/rtu-purchase';
import { RTUProduct } from '@/lib/type/rtu_product';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { isAdmin } from '@/lib/utils/role';
import { setDateStr } from '@/lib/date';
import { DialogFooterSummary } from '@/components/ui/dialog-footer-summary';
import { toIDR } from '@/lib/utils';
import { round } from '@/lib/number';

// ---------------------------------------------------------------------------
// Schema — hanya field scalar, items dikelola via useState
// ---------------------------------------------------------------------------
const schema = z
  .object({
    buyerId: z.string().min(1, 'Outlet pembeli wajib dipilih'),
    purchaseSource: z.enum(['OUTLET', 'VENDOR']),
    sellerId: z.string().optional(),
    vendorId: z.string().optional(),
    notes: z.string().optional(),
    isLoan: z.boolean().optional(),
    requestDate: z.string().min(1, 'Tanggal wajib diisi'),
    paymentType: z.enum(['DP', 'Pelunasan']),
    dpAmount: z.number().min(0),
    taxPercent: z.number().min(0)
  })
  .superRefine((data, ctx) => {
    if (
      data.purchaseSource === 'OUTLET' &&
      (!data.sellerId || data.sellerId.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Outlet penjual wajib dipilih',
        path: ['sellerId']
      });
    }
    if (
      data.purchaseSource === 'VENDOR' &&
      (!data.vendorId || data.vendorId.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vendor eksternal wajib dipilih',
        path: ['vendorId']
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Item row type — dikelola dengan useState biasa
// ---------------------------------------------------------------------------
type ItemRow = {
  productId: string;
  materialId: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  conversion: number;
  notes: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface PurchaseFormProps {
  buyerOutletId?: string; // Digunakan jika add mode
  purchase?: any; // Digunakan jika edit mode
  onClose: () => void;
}

export function PurchaseForm({
  buyerOutletId,
  purchase,
  onClose
}: PurchaseFormProps) {
  const isEdit = !!purchase;

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      buyerId: purchase?.buyerId || getUserFromStorage()?.outlet || '',
      purchaseSource: purchase
        ? purchase.vendorId
          ? 'VENDOR'
          : 'OUTLET'
        : 'VENDOR',
      sellerId: purchase?.sellerId || '',
      vendorId: purchase?.vendorId || '',
      notes: purchase?.notes || '',
      isLoan: purchase?.isLoan || false,
      requestDate: purchase?.requestDate
        ? setDateStr(purchase.requestDate, 'YYYY-MM-DD')
        : purchase?.createdAt
          ? setDateStr(purchase.createdAt, 'YYYY-MM-DD')
          : setDateStr(null, 'YYYY-MM-DD'),
      paymentType: purchase?.paymentType || 'Pelunasan',
      dpAmount: purchase?.dpAmount || 0,
      taxPercent: purchase?.taxPercent || 0
    }
  });

  const watchBuyerId = watch('buyerId');

  const { data: outlets } = useGetOutlets(0, 100);
  const { data: allOutletsForSeller } = useGetOutlets(
    0,
    100,
    '',
    false,
    '',
    false,
    true
  ); // ignoreAccess = true
  const { data: products } = useGetRTUProducts();
  const { data: vendors } = useGetRTUVendors();
  const { data: materials } = useGetRTUMaterials(
    '',
    true, // only active
    undefined,
    watchBuyerId || undefined
  );

  const createMutation = useCreateRTUPurchase();
  const cancelMutation = useCancelRTUPurchase();

  const [purchaseType, setPurchaseType] = useState<'PRODUCT' | 'MATERIAL'>(
    purchase?.type || 'MATERIAL'
  );

  const createEmptyRow = useCallback(
    (type: 'PRODUCT' | 'MATERIAL'): ItemRow => {
      let defProduct = '';
      let defMaterial = '';
      let defUnit = '';

      let defUnitPrice = 0;

      if (type === 'PRODUCT' && products?.data && products.data.length > 0) {
        defProduct = products.data[0]._id;
        defUnit = products.data[0].outputUnit || '';
      } else if (
        type === 'MATERIAL' &&
        materials?.data &&
        materials.data.length > 0
      ) {
        defMaterial = materials.data[0]._id;
        defUnit = materials.data[0].unit || '';
        defUnitPrice = materials.data[0].currentPrice || 0;
      }

      return {
        productId: defProduct,
        materialId: defMaterial,
        qty: 0,
        unit: defUnit,
        unitPrice: defUnitPrice,
        discount: 0,
        conversion: 1,
        notes: ''
      };
    },
    [products?.data, materials?.data]
  );

  const getInitialItems = () => {
    if (isEdit && purchase?.items) {
      return purchase.items.map((i: any) => ({
        productId: i.productId || '',
        materialId: i.materialId || '',
        qty: i.qty || 0,
        unit: i.unit || '',
        unitPrice: i.unitPrice || 0,
        discount: i.discount || 0,
        conversion: i.conversion || 1,
        notes: i.notes || ''
      }));
    }
    return [];
  };

  const [items, setItems] = useState<ItemRow[]>(getInitialItems());
  const [itemError, setItemError] = useState<string | null>(null);

  // Calculate allowed buyer outlets based on user permissions
  const allowedBuyerOutlets = useMemo(() => {
    if (!outlets?.data) return [];
    const currentUser = getUserFromStorage();
    if (!currentUser) return outlets.data;

    const isUserAdmin =
      isAdmin(currentUser.role) || currentUser.outletAccessMode === 'all';
    if (isUserAdmin) return outlets.data;

    const allowedIds = new Set<string>();
    if (currentUser.outlet) allowedIds.add(currentUser.outlet);
    if (currentUser.outletAccess) {
      currentUser.outletAccess.forEach((id) => allowedIds.add(id));
    }
    return outlets.data.filter((o: any) => allowedIds.has(o._id));
  }, [outlets]);

  // Initialize items array when data is available (ONLY FOR ADD)
  useEffect(() => {
    if (!isEdit && items.length === 0) {
      if (purchaseType === 'PRODUCT' && products?.data) {
        setItems([createEmptyRow('PRODUCT')]);
      } else if (purchaseType === 'MATERIAL' && materials?.data) {
        setItems([createEmptyRow('MATERIAL')]);
      }
    }
  }, [
    purchaseType,
    products?.data,
    materials?.data,
    items.length,
    isEdit,
    createEmptyRow
  ]);

  // Auto-select vendor when available (ONLY FOR ADD)
  useEffect(() => {
    if (
      !isEdit &&
      watch('purchaseSource') === 'VENDOR' &&
      !watch('vendorId') &&
      vendors?.data?.length > 0
    ) {
      setValue('vendorId', vendors.data[0]._id);
    }
  }, [vendors?.data, watch, setValue, isEdit]);

  // Auto-select buyer outlet when list loads (ONLY FOR ADD)
  useEffect(() => {
    if (!isEdit && allowedBuyerOutlets.length > 0) {
      const currentVal = watch('buyerId');
      if (!currentVal) {
        const currentUser = getUserFromStorage();
        const primaryId = currentUser?.outlet;
        const hasPrimary = allowedBuyerOutlets.some(
          (o: any) => o._id === primaryId
        );
        if (primaryId && hasPrimary) {
          setValue('buyerId', primaryId);
        } else {
          const hasPropsBuyer = allowedBuyerOutlets.some(
            (o: any) => o._id === buyerOutletId
          );
          if (buyerOutletId && hasPropsBuyer) {
            setValue('buyerId', buyerOutletId);
          }
        }
      }
    }
  }, [allowedBuyerOutlets, buyerOutletId, setValue, watch, isEdit]);

  // ---- Item helpers --------------------------------------------------------
  const addRow = () =>
    setItems((prev) => [...prev, createEmptyRow(purchaseType)]);

  const removeRow = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateRow = (index: number, patch: Partial<ItemRow>) =>
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );

  const handleProductChange = (index: number, productId: string) => {
    const product = products?.data?.find(
      (p: RTUProduct) => p._id === productId
    );
    updateRow(index, {
      productId,
      unit: product?.outputUnit || '',
      unitPrice: 0,
      conversion: 1
    });
  };

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materials?.data?.find(
      (m: RTUMaterial) => m._id === materialId
    );
    updateRow(index, {
      materialId,
      unit: material?.unit || '',
      unitPrice: material?.currentPrice || 0,
      conversion: 1
    });
  };

  const handleTypeChange = (type: 'PRODUCT' | 'MATERIAL') => {
    setPurchaseType(type);
    setItems([createEmptyRow(type)]);
  };

  // ---- Submit --------------------------------------------------------------
  const onSubmit = async (data: FormValues) => {
    // Validasi items
    if (items.length === 0) {
      setItemError('Minimal 1 item harus diisi');
      return;
    }
    const invalidItem = items.find((item) => item.qty <= 0 || !item.unit);
    if (invalidItem) {
      setItemError('Pastikan semua item memiliki qty > 0 dan unit terisi');
      return;
    }
    setItemError(null);

    const payload: any = {
      buyerId: data.buyerId,
      sellerId: data.purchaseSource === 'OUTLET' ? data.sellerId : undefined,
      vendorId: data.purchaseSource === 'VENDOR' ? data.vendorId : undefined,
      type: purchaseType,
      notes: data.notes || '',
      requestDate: new Date(data.requestDate).toISOString(),
      isLoan: data.purchaseSource === 'OUTLET' ? data.isLoan || false : false,
      paymentType: data.paymentType,
      dpAmount: data.paymentType === 'DP' ? data.dpAmount : 0,
      taxPercent: data.taxPercent,
      items: items.map((item) => ({
        productId: purchaseType === 'PRODUCT' ? item.productId : undefined,
        materialId: purchaseType === 'MATERIAL' ? item.materialId : undefined,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discount: item.discount,
        conversion: item.conversion,
        notes: item.notes || ''
      }))
    };

    if (isEdit && purchase?._id) {
      await cancelMutation.mutateAsync(purchase._id);
    }
    await createMutation.mutateAsync(payload);
    onClose();
  };

  const selectedBuyerId = watch('buyerId');
  const sellerOutlets =
    allOutletsForSeller?.data?.filter((o: any) => o._id !== selectedBuyerId) ||
    [];

  const isPending = createMutation.isPending || cancelMutation.isPending;

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = item.qty || 0;
      const price = item.unitPrice || 0;
      const discount = item.discount || 0;
      return sum + qty * price * (1 - discount / 100);
    }, 0);
  }, [items]);

  const taxPercent = watch('taxPercent') || 0;
  const taxAmount = useMemo(() => {
    return (subtotal * taxPercent) / 100;
  }, [subtotal, taxPercent]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const summaryItems = useMemo(() => {
    return [
      {
        label: 'Subtotal',
        value: subtotal
      },
      taxPercent > 0 && {
        label: `PPN (${taxPercent}%)`,
        value: taxAmount
      },
      {
        label: 'Total Biaya PO',
        value: grandTotal,
        isHighlight: true
      }
    ].filter(Boolean) as any[];
  }, [subtotal, taxPercent, taxAmount, grandTotal]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex-1 min-h-0 overflow-hidden flex flex-col"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
        <div className="space-y-6 mt-4">
          {/* Buyer & Seller & Type Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-sm border border-gray-100">
            {/* Buyer Outlet */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <ReusableSelect
                  icon={Store}
                  label="Outlet Pembeli (Penerima)"
                  value={watch('buyerId') || ''}
                  onChange={(v: string) => {
                    setValue('buyerId', v);
                    if (watch('sellerId') === v) setValue('sellerId', '');
                  }}
                  placeholder="Pilih outlet pembeli..."
                  disabled={allowedBuyerOutlets.length <= 1}
                  options={
                    allowedBuyerOutlets?.map((o: any) => ({
                      label: `${o.name} - ${o.type}`,
                      value: o._id
                    })) || []
                  }
                  triggerClassName="h-14 border-none shadow-sm bg-white font-bold text-gray-900"
                />
              </div>
              {errors.buyerId && (
                <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                  {errors.buyerId.message}
                </p>
              )}
            </div>

            {/* Source Toggle */}
            <ButtonToggle
              height="h-14"
              label="Sumber Pembelian"
              icon={Store}
              value={watch('purchaseSource')}
              onChange={(val) => {
                setValue('purchaseSource', val as 'OUTLET' | 'VENDOR');
                if (val === 'OUTLET') {
                  setValue('vendorId', '');
                } else {
                  setValue('sellerId', '');
                }
              }}
              options={[
                {
                  value: 'OUTLET',
                  label: 'Antar-Outlet',
                  icon: Store,
                  activeClassName:
                    'bg-emerald-600 border-emerald-600 text-white',
                  hoverClassName: 'hover:border-emerald-300'
                },
                {
                  value: 'VENDOR',
                  label: 'Vendor (Pihak 3)',
                  icon: Building2,
                  activeClassName: 'bg-indigo-600 border-indigo-600 text-white',
                  hoverClassName: 'hover:border-indigo-300'
                }
              ]}
            />

            {/* Seller / Vendor Selection */}
            {watch('purchaseSource') === 'OUTLET' ? (
              <div className="space-y-3">
                <ReusableSelect
                  icon={Store}
                  label="Outlet Penjual (Sumber)"
                  value={watch('sellerId') || ''}
                  onChange={(v: string) => setValue('sellerId', v)}
                  placeholder="Pilih outlet penjual..."
                  options={
                    sellerOutlets?.map((o: any) => ({
                      label: `${o.name} - ${o.type}`,
                      value: o._id
                    })) || []
                  }
                  triggerClassName="h-14 border-none shadow-sm bg-white font-bold text-gray-900"
                />
                {errors.sellerId && (
                  <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                    {errors.sellerId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <ReusableSelect
                  icon={Building2}
                  label="Vendor Eksternal"
                  value={watch('vendorId') || ''}
                  onChange={(v: string) => setValue('vendorId', v)}
                  placeholder="Pilih vendor..."
                  options={
                    vendors?.data?.map((v: any) => ({
                      label: `${v.name} - ${v.code}`,
                      value: v._id
                    })) || []
                  }
                  triggerClassName="h-14 border-none shadow-sm bg-white font-bold text-gray-900"
                />
                {errors.vendorId && (
                  <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                    {errors.vendorId.message}
                  </p>
                )}
              </div>
            )}

            {/* Type Toggle */}
            <ButtonToggle
              height="h-14"
              label="Jenis Pembelian"
              icon={Layers}
              value={purchaseType}
              onChange={(val) =>
                handleTypeChange(val as 'PRODUCT' | 'MATERIAL')
              }
              options={[
                {
                  value: 'PRODUCT',
                  label: (
                    <>
                      <Package className="w-4 h-4" /> Produk Jadi
                    </>
                  ),
                  activeClassName:
                    'bg-emerald-600 border-emerald-600 text-white',
                  hoverClassName: 'hover:border-emerald-300'
                },
                {
                  value: 'MATERIAL',
                  label: (
                    <>
                      <Box className="w-4 h-4" /> Bahan Baku
                    </>
                  ),
                  activeClassName: 'bg-blue-600 border-blue-600 text-white',
                  hoverClassName: 'hover:border-blue-300'
                }
              ]}
            />
          </div>

          {/* Transaksi Pinjaman */}
          {watch('purchaseSource') === 'OUTLET' && (
            <div className="flex items-start space-x-3 bg-yellow-50/50 p-4 rounded-sm border border-yellow-100/60">
              <Checkbox
                id="isLoan"
                checked={watch('isLoan') || false}
                onCheckedChange={(checked) =>
                  setValue('isLoan', checked === true)
                }
              />
              <div className="grid gap-1 leading-none">
                <label
                  htmlFor="isLoan"
                  className="text-sm font-bold text-gray-800 cursor-pointer select-none"
                >
                  Transaksi Pinjaman (Antar-Outlet)
                </label>
                <p className="text-[11px] font-medium text-yellow-700/80">
                  Tandai jika transaksi ini merupakan pinjam-meminjam bahan
                  baku/produk dan bukan pembelian biasa.
                </p>
              </div>
            </div>
          )}

          {/* Notes & Date & PPN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <FormInput
                icon={StickyNote}
                name="notes"
                label="Catatan (Opsional)"
                value={watch('notes') || ''}
                onChange={(e: any) => setValue('notes', e.target.value)}
                placeholder="Contoh: Pinjam bahan baku mie..."
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <DatePicker
                value={watch('requestDate')}
                onChange={(date) =>
                  setValue('requestDate', date, { shouldValidate: true })
                }
                className="h-12 border-gray-200 rounded-sm font-bold text-gray-700 bg-white w-full"
              />
              {errors.requestDate && (
                <p className="text-[10px] font-bold text-red-500 ml-1 italic">
                  {errors.requestDate.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <FormInput
                type="number"
                step="any"
                name="taxPercent"
                label="PPN (%)"
                value={watch('taxPercent') === 0 ? '' : watch('taxPercent')}
                onChange={(e: any) =>
                  setValue(
                    'taxPercent',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Tipe Pembayaran & DP Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ReusableSelect
                label="Tipe Pembayaran"
                value={watch('paymentType') || 'Pelunasan'}
                onChange={(v: string) => {
                  setValue('paymentType', v as 'DP' | 'Pelunasan');
                  if (v === 'Pelunasan') {
                    setValue('dpAmount', 0);
                  }
                }}
                options={[
                  { label: 'Pelunasan (Bayar Penuh)', value: 'Pelunasan' },
                  { label: 'DP (Uang Muka)', value: 'DP' }
                ]}
                searchable={false}
              />
            </div>
            {watch('paymentType') === 'DP' && (
              <FormInput
                type="currency"
                step="any"
                name="dpAmount"
                label="Nominal DP (Uang Muka)"
                value={watch('dpAmount') === 0 ? '' : watch('dpAmount')}
                onChange={(e: any) =>
                  setValue(
                    'dpAmount',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                placeholder="Masukkan nominal DP..."
              />
            )}
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-500" />
                <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm italic">
                  {purchaseType === 'PRODUCT'
                    ? 'Produk yang Dibeli'
                    : 'Material yang Dibeli'}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-[10px] font-bold uppercase text-emerald-600 hover:bg-emerald-50"
                onClick={addRow}
              >
                + Tambah Baris
              </Button>
            </div>

            {itemError && (
              <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                {itemError}
              </p>
            )}

            <div className="rounded-sm border border-gray-200 overflow-hidden shadow-sm">
              <Table className="w-full table-fixed" containerClassName="h-auto">
                <TableHeader className="bg-slate-900">
                  <TableRow className="h-10 border-none hover:bg-transparent">
                    <TableHead className="w-[35px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                      #
                    </TableHead>
                    <TableHead className="w-[230px] text-white text-[11px] uppercase tracking-wider font-bold">
                      {purchaseType === 'PRODUCT'
                        ? 'Nama Produk'
                        : 'Nama Material'}
                    </TableHead>
                    <TableHead className="w-[85px] text-white text-[11px] uppercase tracking-wider font-bold text-center">
                      Qty
                    </TableHead>
                    <TableHead className="w-[140px] text-white text-[11px] uppercase tracking-wider font-bold text-center">
                      Unit
                    </TableHead>
                    <TableHead className="w-[160px] text-white text-[11px] uppercase tracking-wider font-bold text-right">
                      Harga Master
                    </TableHead>
                    <TableHead className="w-[130px] text-white text-[11px] uppercase tracking-wider font-bold text-right">
                      Harga
                    </TableHead>
                    <TableHead className="w-[80px] text-white text-[11px] uppercase tracking-wider font-bold text-center">
                      Diskon %
                    </TableHead>
                    <TableHead className="w-[130px] text-white text-[11px] uppercase tracking-wider font-bold text-right">
                      Total
                    </TableHead>
                    <TableHead className="text-white text-[11px] uppercase tracking-wider font-bold">
                      Keterangan
                    </TableHead>
                    <TableHead className="w-[60px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    let masterUnitPrice = 0;
                    if (purchaseType === 'MATERIAL' && item.materialId) {
                      const material = materials?.data?.find(
                        (m: any) => m._id === item.materialId
                      );
                      if (material) {
                        let conversionFactor = item.conversion || 1;
                        if (item.unit && item.unit !== material.unit) {
                          const matchUnit = material.units?.find(
                            (u: any) => u.unitName === item.unit
                          );
                          if (matchUnit) {
                            conversionFactor = matchUnit.conversion || 1;
                          }
                        }
                        masterUnitPrice =
                          (material.currentPrice || 0) * conversionFactor;
                      }
                    } else if (purchaseType === 'PRODUCT' && item.productId) {
                      const product = products?.data?.find(
                        (p: any) => p._id === item.productId
                      );
                      if (product) {
                        let conversionFactor = item.conversion || 1;
                        if (item.unit && item.unit !== product.outputUnit) {
                          const matchUnit = product.units?.find(
                            (u: any) => u.unitName === item.unit
                          );
                          if (matchUnit) {
                            conversionFactor = matchUnit.conversion || 1;
                          }
                        }
                        masterUnitPrice =
                          ((product as any).currentPrice || 0) *
                          conversionFactor;
                      }
                    }

                    return (
                      <TableRow
                        key={index}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="text-center font-mono text-xs text-gray-500">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          {purchaseType === 'PRODUCT' ? (
                            <ReusableSelect
                              value={item.productId}
                              onChange={(v: string) =>
                                handleProductChange(index, v)
                              }
                              placeholder="Pilih produk..."
                              options={
                                products?.data?.map((p: RTUProduct) => ({
                                  label: p.name,
                                  value: p._id
                                })) || []
                              }
                              className="text-xs"
                            />
                          ) : (
                            <ReusableSelect
                              value={item.materialId}
                              onChange={(v: string) =>
                                handleMaterialChange(index, v)
                              }
                              placeholder="Pilih material..."
                              options={
                                materials?.data?.map((m: RTUMaterial) => ({
                                  label: m.brand
                                    ? `${m.name} - ${m.brand}`
                                    : m.name,
                                  value: m._id
                                })) || []
                              }
                              className="text-xs"
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          <FormInput
                            type="number"
                            step="any"
                            name={`items.${index}.qty`}
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(index, {
                                qty: val === '' ? 0 : Number(val)
                              });
                            }}
                            className="h-9 text-xs rounded-sm border-gray-200 bg-white text-center font-normal"
                            containerClassName="mb-0"
                          />
                        </TableCell>

                        <TableCell>
                          <ReusableSelect
                            value={item.unit}
                            onChange={(val: string) => {
                              const options: any[] = [];
                              if (purchaseType === 'PRODUCT') {
                                const product = products?.data?.find(
                                  (p: any) => p._id === item.productId
                                );
                                if (product) {
                                  options.push({
                                    value: product.outputUnit,
                                    conversion: 1
                                  });
                                  product.units?.forEach((u: any) =>
                                    options.push({
                                      value: u.unitName,
                                      conversion: u.conversion
                                    })
                                  );
                                }
                              } else {
                                const material = materials?.data?.find(
                                  (m: any) => m._id === item.materialId
                                );
                                if (material) {
                                  options.push({
                                    value: material.unit,
                                    conversion: 1
                                  });
                                  material.units?.forEach((u: any) =>
                                    options.push({
                                      value: u.unitName,
                                      conversion: u.conversion
                                    })
                                  );
                                }
                              }
                              const selected = options.find(
                                (o) => o.value === val
                              );
                              const newConversion = selected?.conversion || 1;
                              let newUnitPrice = item.unitPrice;
                              if (purchaseType === 'MATERIAL') {
                                const material = materials?.data?.find(
                                  (m: any) => m._id === item.materialId
                                );
                                if (material) {
                                  newUnitPrice = round(
                                    (material.currentPrice || 0) *
                                      newConversion,
                                    2
                                  );
                                }
                              }
                              updateRow(index, {
                                unit: val,
                                conversion: newConversion,
                                unitPrice: newUnitPrice
                              });
                            }}
                            options={(() => {
                              if (purchaseType === 'PRODUCT') {
                                const product = products?.data?.find(
                                  (p: any) => p._id === item.productId
                                );
                                if (!product) return [];
                                return [
                                  {
                                    value: product.outputUnit,
                                    label: product.outputUnit
                                  },
                                  ...(product.units?.map((u: any) => ({
                                    value: u.unitName,
                                    label: u.unitName
                                  })) || [])
                                ];
                              } else {
                                const material = materials?.data?.find(
                                  (m: any) => m._id === item.materialId
                                );
                                if (!material) return [];
                                return [
                                  {
                                    value: material.unit,
                                    label: material.unit
                                  },
                                  ...(material.units?.map((u: any) => ({
                                    value: u.unitName,
                                    label: u.unitName
                                  })) || [])
                                ];
                              }
                            })()}
                            className="text-xs"
                            placeholder="Pilih"
                          />
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <span className="font-mono text-xs font-bold text-gray-700 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
                              {masterUnitPrice > 0 ? (
                                <>
                                  <span>{toIDR(masterUnitPrice)}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    / {item.unit || 'unit'}
                                  </span>
                                </>
                              ) : (
                                '-'
                              )}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <FormInput
                            type="currency"
                            step="any"
                            name={`items.${index}.unitPrice`}
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(index, {
                                unitPrice: val === '' ? 0 : Number(val)
                              });
                            }}
                            className="h-9 text-xs rounded-sm border-gray-200 bg-white text-right font-normal"
                            containerClassName="mb-0"
                          />
                        </TableCell>

                        <TableCell>
                          <FormInput
                            type="number"
                            step="any"
                            name={`items.${index}.discount`}
                            value={item.discount === 0 ? '' : item.discount}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(index, {
                                discount: val === '' ? 0 : Number(val)
                              });
                            }}
                            className="h-9 text-xs rounded-sm border-gray-200 bg-white text-center font-normal"
                            containerClassName="mb-0"
                          />
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-gray-700 pt-3.5">
                          {toIDR(
                            (item.qty || 0) *
                              (item.unitPrice || 0) *
                              (1 - (item.discount || 0) / 100)
                          )}
                        </TableCell>

                        <TableCell>
                          <Input
                            value={item.notes}
                            onChange={(e) =>
                              updateRow(index, { notes: e.target.value })
                            }
                            placeholder="keterangan..."
                            className="h-9 bg-white border-gray-200 rounded-sm text-xs"
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={items.length === 1}
                            onClick={() => removeRow(index)}
                            size="sm"
                            className="h-8 px-3 rounded-sm text-[11px] font-bold uppercase tracking-tighter disabled:opacity-30"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
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

      {/* Combined Footer: Totals + Actions */}
      <DialogFooterSummary items={summaryItems}>
        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:text-white rounded-sm font-bold px-6 h-9 text-xs"
        >
          Batalkan
        </Button>
        <Button
          type="submit"
          disabled={isPending || items.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-sm font-bold px-6 gap-2 shadow-lg h-9 text-xs"
          isLoading={isPending}
        >
          {isPending
            ? 'Memproses...'
            : isEdit
              ? 'Simpan Perubahan'
              : 'Simpan Purchase Order'}
        </Button>
      </DialogFooterSummary>
    </form>
  );
}
