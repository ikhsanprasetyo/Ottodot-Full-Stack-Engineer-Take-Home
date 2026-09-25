'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, PackageCheck, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import api from '@/lib/api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';

import { setDateStr } from '@/lib/date';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

const grnItemSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  qtyPo: z.number().optional(),
  qtyReceived: z.number().min(0.001, 'Qty must be greater than 0'),
  unitPrice: z.number(),
  unit: z.string()
});

const grnSchema = z.object({
  purchaseId: z.string().optional(),
  vendorId: z.string().optional(),
  outletId: z.string().min(1, 'Outlet is required'),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  paymentType: z.enum(['DP', 'Pelunasan']),
  dpAmount: z.number().min(0),
  taxPercent: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1, 'At least one item is required')
});

type GRNFormValues = z.infer<typeof grnSchema>;

export function EditGRNDialog({ grn }: { grn: any }) {
  const { hasPermission: canUpdate } = useGetPermission('update');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendorsData } = useGetRTUVendors();
  const { data: materialsData } = useGetRTUMaterials();

  const vendorOptions = useMemo(
    () =>
      (vendorsData?.data || []).map((v: any) => ({
        value: v._id,
        label: v.name
      })),
    [vendorsData]
  );

  const materialOptions = useMemo(
    () =>
      (materialsData?.data || []).map((m: any) => ({
        value: m._id,
        label: `${m.code} - ${m.name}`
      })),
    [materialsData]
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<GRNFormValues>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      receiptDate: grn?.receiptDate
        ? dayjs(grn.receiptDate).format('YYYY-MM-DDTHH:mm')
        : dayjs().format('YYYY-MM-DDTHH:mm'),
      outletId: grn?.outletId || '',
      purchaseId: grn?.purchaseId || '',
      vendorId: grn?.vendorId || '',
      paymentType: grn?.paymentType || 'Pelunasan',
      dpAmount: grn?.dpAmount || 0,
      taxPercent: grn?.taxPercent || 0,
      items: grn?.items?.length
        ? grn.items.map((i: any) => ({
            materialId: i.materialId,
            qtyPo: i.qtyPo || i.qtyReceived,
            qtyReceived: i.qtyReceived,
            unitPrice: i.unitPrice,
            unit: i.unit
          }))
        : [{ materialId: '', qtyPo: 0, qtyReceived: 0, unitPrice: 0, unit: '' }]
    }
  });

  const watchOutletId = watch('outletId');
  const { data: purchasesData } = useGetRTUPurchases({ status: 'PROCESSING' });
  const purchaseOptions = useMemo(() => {
    return (purchasesData || [])
      .filter((p: any) => !watchOutletId || p.buyerId === watchOutletId)
      .map((p: any) => {
        const vendorName = p.vendor?.name || p.seller?.name || 'Manual';
        const itemCount = p.items?.length || 0;
        const dateStr = setDateStr(p.requestDate, 'DD MMM YYYY');
        return {
          value: p._id,
          label: `${p.docNumber} - ${vendorName} - ${itemCount} Items - ${dateStr}`
        };
      });
  }, [purchasesData, watchOutletId]);

  useEffect(() => {
    if (open && grn) {
      reset({
        receiptDate: grn.receiptDate
          ? dayjs(grn.receiptDate).format('YYYY-MM-DDTHH:mm')
          : dayjs().format('YYYY-MM-DDTHH:mm'),
        outletId: grn.outletId || '',
        purchaseId: grn.purchaseId || '',
        vendorId: grn.vendorId || '',
        paymentType: grn.paymentType || 'Pelunasan',
        dpAmount: grn.dpAmount || 0,
        taxPercent: grn.taxPercent || 0,
        items: grn.items?.length
          ? grn.items.map((i: any) => ({
              materialId: i.materialId,
              qtyPo: i.qtyPo || i.qtyReceived,
              qtyReceived: i.qtyReceived,
              unitPrice: i.unitPrice,
              unit: i.unit
            }))
          : [
              {
                materialId: '',
                qtyPo: 0,
                qtyReceived: 0,
                unitPrice: 0,
                unit: ''
              }
            ]
      });
    }
  }, [open, grn, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = useWatch({
    control,
    name: 'items',
    defaultValue: [
      { materialId: '', qtyPo: 0, qtyReceived: 0, unitPrice: 0, unit: '' }
    ]
  });

  const watchPurchaseId = watch('purchaseId');

  // Auto-fill logic when Purchase PO changes
  useEffect(() => {
    if (!watchPurchaseId || !purchasesData) return;
    const selectedPo = (purchasesData as any[]).find(
      (p) => p._id === watchPurchaseId
    );
    if (selectedPo) {
      if (selectedPo.vendorId) {
        setValue('vendorId', selectedPo.vendorId);
      } else {
        setValue('vendorId', '');
      }
      if (selectedPo.buyerId) {
        setValue('outletId', selectedPo.buyerId);
      }
      if (selectedPo.items && selectedPo.items.length > 0) {
        const newItems = selectedPo.items.map((item: any) => ({
          materialId: item.materialId,
          qtyPo: item.qty,
          qtyReceived: item.qty, // Auto-fill with PO qty initially
          unitPrice: item.unitPrice,
          unit: item.unit
        }));
        setValue('items', newItems);
      }
      if (selectedPo.requestDate) {
        setValue(
          'receiptDate',
          dayjs(selectedPo.requestDate).format('YYYY-MM-DDTHH:mm')
        );
      }
    }
  }, [watchPurchaseId, purchasesData, setValue]);

  const onSubmit = async (data: GRNFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        receiptDate: data.receiptDate
          ? new Date(data.receiptDate).toISOString()
          : new Date().toISOString(),
        items: data.items.map((item) => {
          const material = materialsData?.data?.find(
            (m: any) => m._id === item.materialId
          );
          return {
            ...item,
            unitPrice: material?.currentPrice || 0
          };
        }),
        paymentType: data.paymentType,
        dpAmount: data.paymentType === 'DP' ? data.dpAmount : 0,
        taxPercent: data.taxPercent
      };

      // Void old GRN
      if (grn?._id) {
        await api.post(`/rtu/grn/cancel/${grn._id}`);
      }

      // Create new GRN
      await api.post('/rtu/grn', payload);
      toast.success('GRN updated successfully');
      queryClient.invalidateQueries({ queryKey: ['rtu-grns'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      setOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create GRN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaterialChange = useCallback(
    (index: number, materialId: string) => {
      const material = materialsData?.data?.find(
        (m: any) => m._id === materialId
      );
      if (material) {
        setValue(`items.${index}.materialId`, materialId);
        setValue(`items.${index}.unit`, material.unit);
        setValue(`items.${index}.unitPrice`, material.currentPrice);
      }
    },
    [materialsData, setValue]
  );

  const [globalFilter, setGlobalFilter] = useState('');

  const tableDataWithId = useMemo(() => {
    const items = watchItems || [];
    return items.map((item, i) => ({
      ...item,
      _id: fields[i]?.id || `item-${i}`,
      index: i
    }));
  }, [watchItems, fields]);

  const columns = useMemo<ExtendedColumnDef<any>[]>(
    () => [
      {
        header: 'Material',
        accessorKey: 'materialId',
        size: 350,
        enableSorting: false,
        cell: ({ row }) => (
          <Combobox
            options={materialOptions}
            value={row.original.materialId}
            onSelect={(val) => handleMaterialChange(row.index, val)}
            placeholder="Search Material..."
            className="h-9 border-none shadow-none bg-transparent hover:bg-gray-50 focus:bg-white transition-colors"
          />
        )
      },
      {
        header: 'Qty PO',
        accessorKey: 'qtyPo',
        size: 100,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="h-9 flex justify-end items-center px-3 font-bold text-gray-400 bg-gray-50/50 rounded-sm">
            {row.original.qtyPo || 0}
          </div>
        )
      },
      {
        header: 'Qty Received',
        accessorKey: 'qtyReceived',
        size: 150,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => (
          <FormInput
            type="number"
            step="any"
            name={`items.${row.index}.qtyReceived`}
            value={watch(`items.${row.index}.qtyReceived`)}
            onChange={(e: any) =>
              setValue(`items.${row.index}.qtyReceived`, e.target.value)
            }
            placeholder="0"
            className="h-9 text-right font-bold border-none shadow-none bg-transparent hover:bg-gray-50 focus:bg-white transition-all focus:scale-[1.02]"
            containerClassName="mb-0"
          />
        )
      },
      {
        header: 'Unit',
        accessorKey: 'unit',
        size: 100,
        align: 'center',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="h-9 flex justify-center items-center w-full">
            <span className="text-[11px] text-gray-500 bg-gray-100/50 px-2 py-1 rounded-sm">
              {row.original.unit || '-'}
            </span>
          </div>
        )
      }
    ],
    [materialOptions, handleMaterialChange, watch, setValue]
  );

  if (!canUpdate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
          icon={Edit2}
        />
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-blue-600" />
            Edit Goods Receipt Note
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-sm border border-gray-100 mb-6">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">
                  Purchase Order (Opsional)
                </Label>
                <Combobox
                  options={purchaseOptions}
                  value={watch('purchaseId') || ''}
                  onSelect={(val) => setValue('purchaseId', val)}
                  placeholder="Pilih PO..."
                />
                <p className="text-[10px] text-gray-500 italic">
                  *Pilih PO untuk auto-fill data vendor & item
                </p>
              </div>

              {/* watchPurchaseId section was here */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-sm border border-gray-100">
              {watchPurchaseId &&
              (purchasesData as any[])?.find((p) => p._id === watchPurchaseId)
                ?.sellerId ? (
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">
                    Asal Barang (Outlet)
                  </Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-100 text-sm font-bold text-gray-700 flex items-center">
                    {
                      (purchasesData as any[])?.find(
                        (p) => p._id === watchPurchaseId
                      )?.seller?.name
                    }
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">
                    Vendor (Supplier)
                  </Label>
                  <Combobox
                    options={vendorOptions}
                    value={watch('vendorId') || ''}
                    onSelect={(val) => setValue('vendorId', val)}
                    placeholder="Select Vendor..."
                  />
                </div>
              )}
              <OutletSelector
                value={watch('outletId')}
                onSelect={(val) => setValue('outletId', val)}
                required
              />
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">
                  Waktu Penerimaan
                </Label>
                <FormInput
                  type="datetime-local"
                  name="receiptDate"
                  value={watch('receiptDate')}
                  onChange={(e: any) => setValue('receiptDate', e.target.value)}
                  className="h-10"
                  containerClassName="mb-0"
                />
                {errors.receiptDate && (
                  <p className="text-xs text-red-500">
                    {errors.receiptDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2 px-1">
                <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm flex items-center gap-2">
                  Items List
                  <Badge variant="secondary" className="rounded-full">
                    {fields.length}
                  </Badge>
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 font-bold border-dashed hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={() =>
                    append({
                      materialId: '',
                      qtyPo: 0,
                      qtyReceived: 0,
                      unitPrice: 0,
                      unit: ''
                    })
                  }
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </div>

              <div className="min-h-[300px]">
                <TableData
                  data={tableDataWithId}
                  columns={columns}
                  globalFilter={globalFilter}
                  setGlobalFilter={setGlobalFilter}
                  hideSearchInput
                  hidePagination
                  onDelete={(item: any) => remove(item.index)}
                  tableContainerClassName="max-h-[400px] border-none shadow-none rounded-sm"
                />
                {errors.items?.message && (
                  <p className="text-xs text-red-500 mt-2 font-bold italic ml-2">
                    * {errors.items.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-gray-700">
                Notes (Opsional)
              </Label>
              <FormInput
                name="notes"
                value={watch('notes') || ''}
                onChange={(e: any) => setValue('notes', e.target.value)}
                placeholder="Catatan penerimaan..."
                containerClassName="mb-0"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="p-6 bg-white border-t flex-shrink-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="font-bold rounded-sm h-12 px-6"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-sm h-12 px-8 shadow-lg shadow-blue-200"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
