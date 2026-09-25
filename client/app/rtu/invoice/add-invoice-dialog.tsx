'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileCheck, Plus } from 'lucide-react';
import dayjs from 'dayjs';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import {
  useGetRTUPurchases,
  useGetRTUPurchase
} from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import {
  useCreateRTUInvoiceReconcile,
  useUpdateRTUInvoiceReconcile,
  useConfirmRTUInvoiceReconcile,
  useGetRTUInvoiceReconciles
} from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { InvoiceFormContent } from '@/components/shared/invoice-form';
import { RTUInvoiceReconcile } from '@/lib/type/rtu_invoice_reconcile';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { setDateStr } from '@/lib/date';

const invoiceItemSchema = z.object({
  materialId: z.string().min(1),
  qtyInvoiced: z.coerce.number().min(0.001, 'Qty > 0').pipe(z.number()),
  unit: z.string(),
  unitPrice: z.coerce.number().min(0).pipe(z.number()),
  discount: z.coerce.number().min(0).max(100).pipe(z.number()).optional()
});

const invoiceSchema = z.object({
  purchaseId: z.string().optional(),
  outletId: z.string().min(1, 'Cabang wajib diisi'),
  invoiceDate: z.string().min(1, 'Tanggal wajib diisi'),
  taxPercent: z.coerce.number().min(0).max(100).pipe(z.number()).optional(),
  shippingFee: z.coerce.number().min(0).pipe(z.number()).optional(),
  loadingFee: z.coerce.number().min(0).pipe(z.number()).optional(),
  unloadingFee: z.coerce.number().min(0).pipe(z.number()).optional(),
  additionalCosts: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama biaya wajib diisi'),
        amount: z.coerce.number().min(0).pipe(z.number()),
        notes: z.string().optional()
      })
    )
    .optional(),
  notes: z.string().optional(),
  grnIds: z.array(z.string()),
  items: z.array(invoiceItemSchema).min(1, 'Minimal 1 item')
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface AddInvoiceDialogProps {
  /** Pass existing invoice for edit/update mode */
  invoice?: RTUInvoiceReconcile;
  /** Pre-fill from a specific PO */
  initialPoId?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  /** Custom trigger button */
  customTrigger?: React.ReactNode;
}

export function AddInvoiceDialog({
  invoice,
  initialPoId,
  defaultOpen = false,
  onClose,
  customTrigger
}: AddInvoiceDialogProps) {
  const { hasPermission: canCreate } = useGetPermission('create');
  const { hasPermission: canUpdate } = useGetPermission('update');
  const isEditMode = !!invoice;

  const [open, setOpen] = useState(defaultOpen);
  const [selectedGrnIds, setSelectedGrnIds] = useState<string[]>(
    invoice?.grns?.map((g) => g._id) || []
  );

  const createMutation = useCreateRTUInvoiceReconcile();
  const updateMutation = useUpdateRTUInvoiceReconcile();
  const confirmMutation = useConfirmRTUInvoiceReconcile();

  const defaultOutletId =
    typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : '';

  // Declare form early so we can derive watchPurchaseId for the individual PO fetch hook.
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      purchaseId: invoice?.purchaseId || initialPoId || '',
      outletId: invoice?.outletId || defaultOutletId,
      invoiceDate: invoice?.invoiceDate
        ? dayjs(invoice.invoiceDate).format('YYYY-MM-DDTHH:mm')
        : dayjs().format('YYYY-MM-DDTHH:mm'),
      taxPercent: invoice?.taxPercent || 0,
      shippingFee: invoice?.shippingFee || 0,
      loadingFee: invoice?.loadingFee || 0,
      unloadingFee: invoice?.unloadingFee || 0,
      additionalCosts: invoice?.additionalCosts || [],
      notes: invoice?.notes || '',
      grnIds: selectedGrnIds,
      items:
        invoice?.items?.map((i) => ({
          materialId: i.materialId,
          qtyInvoiced: i.qtyInvoiced,
          unit: i.unit,
          unitPrice: i.unitPrice,
          discount: i.discount || 0
        })) || []
    }
  });

  // Derive watchPurchaseId BEFORE calling useGetRTUPurchase (hook ordering requirement)
  const watchPurchaseId = form.watch('purchaseId');
  const watchOutletId = form.watch('outletId');

  // Fetch all purchases for the dropdown list
  const { data: purchasesData } = useGetRTUPurchases();
  // Fetch existing invoices to filter out POs that already have an active invoice
  const { data: existingInvoicesResponse } = useGetRTUInvoiceReconciles();

  // Fetch the SELECTED PO's full detail (includes items) — avoids race condition with list
  const { data: selectedPoDetail } = useGetRTUPurchase(watchPurchaseId || '');
  const { data: grnsResponse } = useGetRTUGRNs('CONFIRMED');

  // Load outlet specific materials to fetch latest prices
  const { data: materialsResponse, isLoading: isMaterialsLoading } =
    useGetRTUMaterials(
      '',
      true, // only active
      undefined,
      watchOutletId || undefined
    );
  const materialsList = materialsResponse?.data;

  const materialsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (materialsList) {
      materialsList.forEach((m: any) => {
        map.set(m._id, m);
      });
    }
    return map;
  }, [materialsList]);

  const usedPurchaseIds = useMemo(() => {
    const invoices: RTUInvoiceReconcile[] =
      existingInvoicesResponse?.data || [];
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.purchaseId && inv.status !== 'CANCELLED') {
        if (isEditMode && invoice?.purchaseId === inv.purchaseId) {
          return;
        }
        set.add(inv.purchaseId);
      }
    });
    return set;
  }, [existingInvoicesResponse, isEditMode, invoice]);

  const purchaseOptions = useMemo(() => {
    const allPurchases: any[] = purchasesData || [];
    return allPurchases
      .filter(
        (p: any) =>
          ['PROCESSING', 'COMPLETED', 'DRAFT'].includes(p.status) &&
          !usedPurchaseIds.has(p._id)
      )
      .map((p: any) => ({
        value: p._id,
        label: `${p.docNumber} — ${
          p.vendor?.name || p.seller?.name || 'Internal'
        } (${p.status})`
      }));
  }, [purchasesData, usedPurchaseIds]);

  // Auto-fill items from linked PO when purchaseId changes.
  // Uses selectedPoDetail (individual fetch) to avoid race condition with list loading.
  const lastAutoFilledPoId = useMemo(() => ({ current: '' }), []);

  // When dialog opens, reset form
  useEffect(() => {
    if (open) {
      lastAutoFilledPoId.current = '';
      const grnIds = invoice?.grns?.map((g) => g._id) || [];
      setSelectedGrnIds(grnIds);
      form.reset({
        purchaseId: invoice?.purchaseId || initialPoId || '',
        outletId: invoice?.outletId || defaultOutletId,
        invoiceDate: invoice?.invoiceDate
          ? setDateStr(invoice.invoiceDate, 'YYYY-MM-DDTHH:mm')
          : setDateStr(new Date(), 'YYYY-MM-DDTHH:mm'),
        taxPercent: invoice?.taxPercent || 0,
        shippingFee: invoice?.shippingFee || 0,
        loadingFee: invoice?.loadingFee || 0,
        unloadingFee: invoice?.unloadingFee || 0,
        additionalCosts: invoice?.additionalCosts || [],
        notes: invoice?.notes || '',
        grnIds,
        items:
          invoice?.items?.map((i) => ({
            materialId: i.materialId,
            qtyInvoiced: i.qtyInvoiced,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discount: i.discount || 0
          })) || []
      });
    }
  }, [open, invoice, initialPoId, defaultOutletId, form, lastAutoFilledPoId]);
  // Synchronize outletId when selectedPoDetail changes
  useEffect(() => {
    if (!isEditMode && selectedPoDetail?.buyerId) {
      const currentOutletId = form.getValues('outletId');
      if (currentOutletId !== selectedPoDetail.buyerId) {
        form.setValue('outletId', selectedPoDetail.buyerId);
      }
    }
  }, [selectedPoDetail, isEditMode, form]);

  useEffect(() => {
    // In edit mode, items come from invoice.items via form defaultValues — don't overwrite
    if (isEditMode) return;
    if (!watchPurchaseId) return;
    if (!selectedPoDetail) return; // Wait until individual PO is loaded
    if (selectedPoDetail.buyerId && watchOutletId !== selectedPoDetail.buyerId)
      return; // Wait until outletId is synced
    if (isMaterialsLoading) return; // Wait until materials for the synced outlet are loaded
    if (!grnsResponse?.data) return; // Wait until GRNs are loaded to avoid race condition on initial load
    if (lastAutoFilledPoId.current === watchPurchaseId) return; // Avoid double-fill
    if (!selectedPoDetail.items?.length) return;

    lastAutoFilledPoId.current = watchPurchaseId;

    // Get all CONFIRMED GRNs for this PO
    const poGrns = (grnsResponse?.data || []).filter(
      (g: any) => g.purchaseId === watchPurchaseId && g.status === 'CONFIRMED'
    );

    // Set linked GRN IDs
    const grnIds = poGrns.map((g: any) => g._id);
    setSelectedGrnIds(grnIds);
    form.setValue('grnIds', grnIds);

    // Calculate cumulative received qty per material from all confirmed GRNs
    const receivedMap = new Map<string, number>();
    const unitMap = new Map<string, string>();
    poGrns.forEach((g: any) => {
      g.items?.forEach((i: any) => {
        receivedMap.set(
          i.materialId,
          (receivedMap.get(i.materialId) || 0) + (i.qtyReceived || 0)
        );
        if (i.unit) unitMap.set(i.materialId, i.unit);
      });
    });

    // Build invoice items: qty = cumulative GRN received (or PO qty as fallback)
    const newItems = selectedPoDetail.items.map((poItem: any) => {
      const materialId = poItem.materialId;
      const totalReceived = receivedMap.get(materialId) || 0;
      const itemUnit = unitMap.get(materialId) || poItem.unit;

      // Find the material in our materialsMap (which has outlet-specific currentPrice and preloaded units!)
      const material = materialsMap.get(materialId) || poItem.material;

      // Calculate unit price from material currentPrice (latest price from material master/outlet stock)
      let conversionFactor = 1;
      if (material) {
        if (itemUnit !== material.unit) {
          const matchUnit = material.units?.find(
            (u: any) => u.unitName === itemUnit
          );
          if (matchUnit) {
            conversionFactor = matchUnit.conversion || 1;
          }
        }
      }
      const basePrice = material?.currentPrice || 0;
      const materialUnitPrice = basePrice * conversionFactor;

      // Use latest material price if set, otherwise fallback to PO unitPrice
      const finalUnitPrice =
        materialUnitPrice > 0 ? materialUnitPrice : poItem.unitPrice || 0;

      return {
        materialId,
        qtyInvoiced: totalReceived > 0 ? totalReceived : poItem.qty,
        unit: itemUnit,
        unitPrice: finalUnitPrice,
        discount: poItem.discount || 0
      };
    });

    form.setValue('items', newItems, { shouldValidate: true });
  }, [
    watchPurchaseId,
    watchOutletId,
    selectedPoDetail,
    grnsResponse,
    isMaterialsLoading,
    materialsMap,
    form,
    isEditMode,
    lastAutoFilledPoId
  ]);

  const handleSubmit = async (data: InvoiceFormValues, confirm = false) => {
    const selectedPo = (purchasesData as any[])?.find(
      (p) => p._id === data.purchaseId
    );

    if (selectedPo) {
      const poShipping = selectedPo.shippingFee || 0;
      const poLoading = selectedPo.loadingFee || 0;
      const poUnloading = selectedPo.unloadingFee || 0;
      const poCustom = (selectedPo.additionalCosts || []).reduce(
        (acc: number, c: any) => acc + (c.amount || 0),
        0
      );

      const invShipping = data.shippingFee || 0;
      const invLoading = data.loadingFee || 0;
      const invUnloading = data.unloadingFee || 0;
      const invCustom = (data.additionalCosts || []).reduce(
        (acc: number, c: any) => acc + (c.amount || 0),
        0
      );

      const poTotalFees = poShipping + poLoading + poUnloading + poCustom;
      const invTotalFees = invShipping + invLoading + invUnloading + invCustom;

      if (poTotalFees !== invTotalFees) {
        const proceed = window.confirm(
          `Perhatian: Total biaya jasa (Rp ${invTotalFees.toLocaleString()}) berbeda dengan estimasi biaya pada Purchase Order (Rp ${poTotalFees.toLocaleString()}). Apakah Anda yakin ingin melanjutkan penyimpanan?`
        );
        if (!proceed) return;
      }
    }

    const payload: any = {
      ...data,
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      taxPercent: data.taxPercent || 0,
      shippingFee: data.shippingFee || 0,
      loadingFee: data.loadingFee || 0,
      unloadingFee: data.unloadingFee || 0,
      additionalCosts: data.additionalCosts || [],
      grnIds: selectedGrnIds,
      vendorId: selectedPo?.vendorId || null
    };

    try {
      if (isEditMode && invoice) {
        await updateMutation.mutateAsync({ id: invoice._id, payload });
        if (confirm) {
          await confirmMutation.mutateAsync(invoice._id);
        }
      } else {
        const created = await createMutation.mutateAsync(payload);
        if (confirm && created?.data?._id) {
          await confirmMutation.mutateAsync(created.data._id);
        }
      }
      handleClose();
    } catch {
      // errors handled in mutation
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
    const url = new URL(window.location.href);
    if (url.searchParams.has('action') || url.searchParams.has('poId')) {
      url.searchParams.delete('action');
      url.searchParams.delete('poId');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    confirmMutation.isPending;

  const trigger = customTrigger || (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-3 text-[10px] font-bold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-sm"
    >
      {isEditMode ? (
        <>
          <FileCheck className="w-3.5 h-3.5" /> Edit Invoice
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" /> Buat Invoice
        </>
      )}
    </Button>
  );

  const canSubmit = isEditMode ? canUpdate : canCreate;

  // Linked GRNs for display
  const linkedGrns = useMemo(() => {
    if (!grnsResponse?.data) return [];
    return grnsResponse.data.filter((g: any) => selectedGrnIds.includes(g._id));
  }, [grnsResponse, selectedGrnIds]);

  // Material name lookup from selectedPoDetail (individual fetch — always has material preloaded)
  const materialNameMap = useMemo(() => {
    const map = new Map<string, string>();
    // From individually fetched PO detail
    selectedPoDetail?.items?.forEach((item: any) => {
      if (item.material?.name) map.set(item.materialId, item.material.name);
      if (item.material?.code)
        map.set(`${item.materialId}_code`, item.material.code);
      if (item.material?.brand)
        map.set(`${item.materialId}_brand`, item.material.brand);
    });
    // Also from existing invoice items (for edit mode)
    invoice?.items?.forEach((i) => {
      if (i.material?.name) map.set(i.materialId, i.material.name);
      if (i.material?.code)
        map.set(`${i.materialId}_code`, i.material.code || '');
      if (i.material?.brand)
        map.set(`${i.materialId}_brand`, i.material.brand || '');
    });
    return map;
  }, [selectedPoDetail, invoice]);

  if (!canSubmit && !customTrigger) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-sm">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            {isEditMode
              ? `Edit Invoice #${invoice?.invoiceNumber}`
              : 'Buat Invoice Reconcile Baru'}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Dokumen keuangan rekonsiliasi tagihan dari vendor (AP Invoice).
            Tidak mengubah stok.
          </p>
        </DialogHeader>

        <InvoiceFormContent
          form={form}
          onSubmit={form.handleSubmit((d) => handleSubmit(d, true))}
          isSubmitting={isSubmitting}
          onCancel={handleClose}
          mode="invoice"
          purchaseOptions={purchaseOptions}
          linkedGrns={linkedGrns}
          materialNameMap={materialNameMap}
          materialsMap={materialsMap}
        />
      </DialogContent>
    </Dialog>
  );
}
