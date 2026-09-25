'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  PackageCheck,
  Trash2,
  ShoppingCart,
  Store,
  Calendar,
  FileText
} from 'lucide-react';
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
import { ReusableSelect } from '@/components/ui/reusable-select';
import api from '@/lib/api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUGRNs } from '@/lib/hooks/queries/rtu-grn';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { setDateStr } from '@/lib/date';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

const grnItemSchema = z
  .object({
    materialId: z.string().min(1, 'Material is required'),
    qtyPo: z.number().optional(),
    maxQty: z.number().optional(),
    qtyReceived: z.number().min(0.001, 'Qty must be greater than 0'),
    unitPrice: z.number(),
    unit: z.string(),
    conversion: z.number()
  })
  .refine(
    (data) => {
      if (
        data.maxQty !== undefined &&
        data.maxQty !== null &&
        data.qtyReceived > data.maxQty
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Melebihi sisa PO',
      path: ['qtyReceived']
    }
  );

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

interface AddGRNDialogProps {
  initialOpen?: boolean;
  initialPoId?: string;
}

export function AddGRNDialog({
  initialOpen = false,
  initialPoId
}: AddGRNDialogProps) {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(initialOpen);
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
      (materialsData?.data || []).map((m: any) => {
        const brandStr = m.brand ? ` - ${m.brand}` : '';
        return {
          value: m._id,
          label: `${m.code} - ${m.name}${brandStr}`
        };
      }),
    [materialsData]
  );

  const defaultVendorId = useMemo(() => {
    if (!vendorsData?.data) return '';
    const found = vendorsData.data.find(
      (v: any) => v.name.toLowerCase() === 'pt maju bersama'
    );
    if (found) return found._id;
    const partialFound = vendorsData.data.find((v: any) =>
      v.name.toLowerCase().includes('maju bersama')
    );
    return partialFound ? partialFound._id : '';
  }, [vendorsData]);

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
      receiptDate: dayjs().format('YYYY-MM-DDTHH:mm'),
      outletId:
        typeof window !== 'undefined' ? getUserFromStorage()?.outlet || '' : '',
      purchaseId: initialPoId || '',
      vendorId: '',
      paymentType: 'Pelunasan',
      dpAmount: 0,
      taxPercent: 0,
      items: [
        {
          materialId: '',
          qtyPo: 0,
          maxQty: 0,
          qtyReceived: 0,
          unitPrice: 0,
          unit: '',
          conversion: 1
        }
      ]
    }
  });

  const watchOutletId = watch('outletId');
  const { data: purchasesData } = useGetRTUPurchases({ status: 'PROCESSING' });
  const { data: grnsResponse } = useGetRTUGRNs('CONFIRMED,DRAFT');
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
    if (open) {
      const selectedPo = (purchasesData as any[])?.find(
        (p) => p._id === initialPoId
      );
      if (selectedPo && initialPoId) {
        const poGrns = (grnsResponse?.data || []).filter(
          (g: any) => g.purchaseId === initialPoId
        );
        const receivedMap = new Map<string, number>();
        poGrns.forEach((g: any) => {
          (g.items || []).forEach((i: any) => {
            receivedMap.set(
              i.materialId,
              (receivedMap.get(i.materialId) || 0) + (i.qtyReceived || 0)
            );
          });
        });

        const newItems = selectedPo.items.map((item: any) => {
          const previouslyReceived = receivedMap.get(item.materialId) || 0;
          const remainingQty = Math.max(0, item.qty - previouslyReceived);
          return {
            materialId: item.materialId,
            qtyPo: item.qty,
            maxQty: remainingQty,
            qtyReceived: remainingQty,
            unitPrice: item.unitPrice,
            unit: item.unit,
            conversion: item.conversion || 1
          };
        });

        reset({
          receiptDate: selectedPo.requestDate
            ? dayjs(selectedPo.requestDate).format('YYYY-MM-DDTHH:mm')
            : dayjs().format('YYYY-MM-DDTHH:mm'),
          outletId: selectedPo.buyerId || getUserFromStorage()?.outlet || '',
          purchaseId: initialPoId,
          vendorId: selectedPo.vendorId || '',
          paymentType: selectedPo.paymentType || 'Pelunasan',
          dpAmount: selectedPo.dpAmount || 0,
          taxPercent: selectedPo.taxPercent || 0,
          items: newItems,
          notes: ''
        });
      } else {
        reset({
          receiptDate: dayjs().format('YYYY-MM-DDTHH:mm'),
          outletId: getUserFromStorage()?.outlet || '',
          purchaseId: initialPoId || '',
          vendorId: defaultVendorId || '',
          paymentType: 'Pelunasan',
          dpAmount: 0,
          taxPercent: 0,
          items: [
            {
              materialId: '',
              qtyPo: 0,
              maxQty: 0,
              qtyReceived: 0,
              unitPrice: 0,
              unit: '',
              conversion: 1
            }
          ],
          notes: ''
        });
      }
    }
  }, [open, defaultVendorId, reset, initialPoId, purchasesData, grnsResponse]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = useWatch({
    control,
    name: 'items',
    defaultValue: [
      {
        materialId: '',
        qtyPo: 0,
        qtyReceived: 0,
        unitPrice: 0,
        unit: '',
        conversion: 1
      }
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
        const poGrns = (grnsResponse?.data || []).filter(
          (g: any) => g.purchaseId === watchPurchaseId
        );
        const receivedMap = new Map<string, number>();
        poGrns.forEach((g: any) => {
          (g.items || []).forEach((i: any) => {
            receivedMap.set(
              i.materialId,
              (receivedMap.get(i.materialId) || 0) + (i.qtyReceived || 0)
            );
          });
        });

        const newItems = selectedPo.items.map((item: any) => {
          const previouslyReceived = receivedMap.get(item.materialId) || 0;
          const remainingQty = Math.max(0, item.qty - previouslyReceived);
          return {
            materialId: item.materialId,
            qtyPo: item.qty,
            maxQty: remainingQty,
            qtyReceived: remainingQty, // Auto-fill with remaining qty initially
            unitPrice: item.unitPrice,
            unit: item.unit,
            conversion: item.conversion || 1
          };
        });
        setValue('items', newItems);
      }
      if (selectedPo.requestDate) {
        setValue(
          'receiptDate',
          dayjs(selectedPo.requestDate).format('YYYY-MM-DDTHH:mm')
        );
      }
      setValue('paymentType', selectedPo.paymentType || 'Pelunasan');
      setValue('dpAmount', selectedPo.dpAmount || 0);
      setValue('taxPercent', selectedPo.taxPercent || 0);
    }
  }, [watchPurchaseId, purchasesData, grnsResponse, setValue]);

  const onSubmit = async (data: GRNFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...data,
        receiptDate: data.receiptDate
          ? new Date(data.receiptDate).toISOString()
          : new Date().toISOString(),
        paymentType: data.paymentType,
        dpAmount: data.paymentType === 'DP' ? data.dpAmount : 0,
        taxPercent: data.taxPercent,
        items: data.items.map((item) => {
          const material = materialsData?.data?.find(
            (m: any) => m._id === item.materialId
          );
          return {
            ...item,
            unitPrice: material?.currentPrice || 0
          };
        })
      };

      if (!payload.purchaseId) {
        delete payload.purchaseId;
      }
      if (!payload.vendorId) {
        delete payload.vendorId;
      }

      await api.post('/rtu/grn', payload);
      toast.success('GRN created successfully');
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
        setValue(`items.${index}.conversion`, 1);
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
        size: 150,
        align: 'right',
        enableSorting: false,
        cell: ({ row }) => {
          const maxQty = row.original.maxQty;
          const unit = row.original.unit || '';
          return (
            <div className="h-9 flex flex-col justify-center items-end px-3 font-bold text-gray-400 bg-gray-50/50 rounded-sm leading-tight">
              <span>
                {row.original.qtyPo || 0} {unit}
              </span>
              {maxQty !== undefined && (
                <span className="text-[10px] text-orange-500 whitespace-nowrap">
                  Sisa belum diterima: {maxQty} {unit}
                </span>
              )}
            </div>
          );
        }
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
            max={
              row.original.maxQty !== undefined
                ? row.original.maxQty
                : undefined
            }
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
        cell: ({ row }) => {
          const material = materialsData?.data?.find(
            (m: any) => m._id === row.original.materialId
          );
          const options: any[] = [];
          if (material) {
            options.push({
              value: material.unit,
              label: material.unit,
              conversion: 1
            });
            material.units?.forEach((u: any) => {
              options.push({
                value: u.unitName,
                label: u.unitName,
                conversion: u.conversion
              });
            });
          }

          return (
            <div className="h-9 flex justify-center items-center w-full">
              <ReusableSelect
                value={row.original.unit || ''}
                onChange={(val: string) => {
                  const selected = options.find((o) => o.value === val);
                  setValue(`items.${row.index}.unit`, val);
                  const newConversion = selected?.conversion || 1;
                  setValue(`items.${row.index}.conversion`, newConversion);
                  const material = materialsData?.data?.find(
                    (m: any) => m._id === row.original.materialId
                  );
                  if (material) {
                    setValue(
                      `items.${row.index}.unitPrice`,
                      (material.currentPrice || 0) * newConversion
                    );
                  }
                }}
                options={options}
                className="text-xs"
                placeholder="Unit"
              />
            </div>
          );
        }
      },
      {
        header: 'Aksi',
        id: 'actions',
        size: 80,
        align: 'center',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center items-center h-9">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(row.index)}
              className="h-8 w-8 p-0 rounded-sm hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              title="Hapus Item"
              icon={Trash2}
            />
          </div>
        )
      }
    ],
    [
      materialOptions,
      handleMaterialChange,
      watch,
      setValue,
      materialsData,
      remove
    ]
  );

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="primary"
          className="font-bold gap-2 shadow-lg hover:shadow-xl transition-all rounded-sm"
          icon={Plus}
        >
          Create GRN
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-blue-600" />
            New Goods Receipt Note
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-sm border border-gray-100">
              <div>
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1 ml-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
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
                <div>
                  <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1 ml-1">
                    <Store className="w-3.5 h-3.5 text-indigo-500" />
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
                <div>
                  <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1 ml-1">
                    <Store className="w-3.5 h-3.5 text-blue-500" />
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
              <div>
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1 ml-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
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
                      unit: '',
                      conversion: 1
                    })
                  }
                  icon={Plus}
                >
                  Add Item
                </Button>
              </div>

              <TableData
                data={tableDataWithId}
                columns={columns}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                hideSearchInput
                hidePagination
                tableContainerClassName="h-auto max-h-[400px] border-none shadow-none rounded-sm"
              />
              {errors.items?.message && (
                <p className="text-xs text-red-500 mt-2 font-bold italic ml-2">
                  * {errors.items.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1 ml-1">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save GRN'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
