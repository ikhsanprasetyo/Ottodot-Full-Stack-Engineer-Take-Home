'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api/api';
import { useQueryClient } from '@tanstack/react-query';
import { RTUGRN } from '@/lib/type/rtu_grn';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import { InvoiceFormContent } from '@/components/shared/invoice-form';

const invoiceItemSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  qtyReceived: z.number().min(0.001, 'Qty must be greater than 0'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  discount: z.number().optional(),
  unit: z.string()
});

const invoiceSchema = z.object({
  vendorId: z.string().optional(),
  outletId: z.string().min(1, 'Outlet is required'),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  notes: z.string().optional(),
  taxPercent: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  loadingFee: z.number().min(0).optional(),
  unloadingFee: z.number().min(0).optional(),
  additionalCosts: z
    .array(
      z.object({
        name: z.string().min(1, 'Nama biaya wajib diisi'),
        amount: z.coerce.number().min(0).pipe(z.number()),
        notes: z.string().optional()
      })
    )
    .optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required')
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface EditInvoiceDialogProps {
  invoice: RTUGRN;
  defaultOpen?: boolean;
}

export function EditInvoiceDialog({
  invoice,
  defaultOpen = false
}: EditInvoiceDialogProps) {
  const { hasPermission: canUpdate } = useGetPermission('update');
  const [open, setOpen] = useState(defaultOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { data: purchases } = useGetRTUPurchases();
  const { data: grnsResponse } = useGetRTUGRNs();

  const selectedPo = useMemo(() => {
    if (!invoice.purchaseId || !purchases) return null;
    return (purchases as any[]).find((p) => p._id === invoice.purchaseId);
  }, [purchases, invoice.purchaseId]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      vendorId: invoice.vendorId || '',
      outletId: invoice.outletId || '',
      receiptDate: invoice.receiptDate
        ? dayjs(invoice.receiptDate).format('YYYY-MM-DDTHH:mm')
        : '',
      notes: invoice.notes || '',
      taxPercent: invoice.taxPercent || 0,
      shippingFee: invoice.shippingFee || 0,
      loadingFee: invoice.loadingFee || 0,
      unloadingFee: invoice.unloadingFee || 0,
      additionalCosts: invoice.additionalCosts || [],
      items: (invoice.items || []).map((item) => ({
        materialId: item.materialId || '',
        qtyReceived: item.qtyReceived,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
        unit: item.unit
      }))
    }
  });

  const { handleSubmit, reset } = form;

  // Re-sync defaultValues if invoice changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        vendorId: invoice.vendorId || '',
        outletId: invoice.outletId || '',
        receiptDate: invoice.receiptDate
          ? dayjs(invoice.receiptDate).format('YYYY-MM-DDTHH:mm')
          : '',
        notes: invoice.notes || '',
        taxPercent: invoice.taxPercent || 0,
        shippingFee: invoice.shippingFee || 0,
        loadingFee: invoice.loadingFee || 0,
        unloadingFee: invoice.unloadingFee || 0,
        additionalCosts: invoice.additionalCosts || [],
        items: (invoice.items || []).map((item) => ({
          materialId: item.materialId || '',
          qtyReceived: item.qtyReceived,
          unitPrice: item.unitPrice || 0,
          discount: item.discount || 0,
          unit: item.unit
        }))
      });
    }
  }, [open, invoice, reset]);

  const saveInvoice = async (data: InvoiceFormValues) => {
    const payload = {
      ...data,
      vendorId: data.vendorId || null,
      receiptDate: data.receiptDate
        ? new Date(data.receiptDate).toISOString()
        : new Date().toISOString()
    };
    await api.put(`/rtu/grn/${invoice._id}`, payload);
  };

  const handleConfirm = async (data: InvoiceFormValues) => {
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

    setIsSubmitting(true);
    try {
      await saveInvoice(data);

      await api.post(`/rtu/grn/confirm/${invoice._id}`);
      toast.success('Invoice confirmed and stock posted');

      queryClient.invalidateQueries({ queryKey: ['rtu-grns'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          // Remove query parameters from URL when closing the modal, so it doesn't reopen on reload
          const url = new URL(window.location.href);
          if (url.searchParams.has('action') || url.searchParams.has('grnId')) {
            url.searchParams.delete('action');
            url.searchParams.delete('grnId');
            window.history.replaceState({}, '', url.toString());
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[10px] font-bold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 rounded-sm"
          title="Rekonsiliasi Invoice"
        >
          <FileCheck className="h-3.5 w-3.5" />
          Rekonsiliasi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden text-gray-900 border-none shadow-2xl rounded-sm">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            Rekonsiliasi Invoice #{invoice.grnNumber}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Dokumen keuangan rekonsiliasi tagihan dari vendor (AP Invoice).
            Tidak mengubah stok.
          </p>
        </DialogHeader>

        <InvoiceFormContent
          form={form}
          onSubmit={handleSubmit(handleConfirm)}
          isSubmitting={isSubmitting}
          onCancel={() => setOpen(false)}
          mode="grn"
          outletName={invoice?.outlet?.label}
          vendorName={invoice.vendor?.name || 'Manual Inbound'}
          selectedPo={selectedPo}
          grnsResponse={grnsResponse}
          grnId={invoice._id}
          purchaseId={invoice.purchaseId}
          grnItemsOriginal={invoice.items}
          canUpdate={canUpdate}
        />
      </DialogContent>
    </Dialog>
  );
}
