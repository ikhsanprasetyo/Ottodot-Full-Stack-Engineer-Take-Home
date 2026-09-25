import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Package,
  Box,
  MapPin,
  Layers,
  Trash2,
  Store,
  Building2
} from 'lucide-react';
import { ButtonToggle } from '@/components/ui/button-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/ui/form-input';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { RTUProduct } from '@/lib/type/rtu_product';
import { RTUMaterial } from '@/lib/type/rtu_material';

import { OutletSelector } from '@/components/shared/outlet-selector';
import { DialogFooter } from '@/components/ui/dialog';
import { round } from '@/lib/number';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export const distributionSchema = z
  .object({
    sourceOutletId: z.string().min(1, 'Outlet asal wajib dipilih'),
    destinationType: z.enum(['OUTLET', 'VENDOR']),
    outletId: z.string().optional(),
    vendorId: z.string().optional(),
    type: z.enum(['PRODUCT', 'MATERIAL']),
    shipmentDate: z.string().min(1, 'Tanggal kirim wajib diisi'),
    shipmentTime: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().optional(),
          materialId: z.string().optional(),
          qty: z.number().min(0.001, 'Qty harus > 0'),
          unit: z.string().min(1, 'Unit wajib diisi'),
          notes: z.string().optional()
        })
      )
      .min(1, 'Minimal 1 item')
  })
  .superRefine((data, ctx) => {
    if (
      data.destinationType === 'OUTLET' &&
      (!data.outletId || data.outletId.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Outlet tujuan wajib dipilih',
        path: ['outletId']
      });
    }
    if (
      data.destinationType === 'VENDOR' &&
      (!data.vendorId || data.vendorId.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vendor eksternal wajib dipilih',
        path: ['vendorId']
      });
    }
  });

export type DistributionFormValues = z.infer<typeof distributionSchema>;

interface DistributionFormProps {
  initialValues?: Partial<DistributionFormValues>;
  destinationOptions?: { label: string; value: string }[];
  onSubmit: (data: DistributionFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function DistributionForm({
  initialValues,
  destinationOptions: _destinationOptions,
  onSubmit,
  onCancel,
  isSubmitting
}: DistributionFormProps) {
  const [distType, setDistType] = useState<'PRODUCT' | 'MATERIAL'>(
    initialValues?.type || 'PRODUCT'
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<DistributionFormValues>({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      sourceOutletId: initialValues?.sourceOutletId || '',
      destinationType:
        initialValues?.destinationType ||
        (initialValues?.vendorId ? 'VENDOR' : 'OUTLET'),
      outletId: initialValues?.outletId || '',
      vendorId: initialValues?.vendorId || '',
      type: initialValues?.type || 'PRODUCT',
      shipmentDate: initialValues?.shipmentDate || '',
      shipmentTime: initialValues?.shipmentTime || '07:00',
      notes: initialValues?.notes || '',
      items: initialValues?.items || [
        { productId: '', materialId: '', qty: 0, unit: '', notes: '' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const selectedSourceOutletId = watch('sourceOutletId');

  const { data: products } = useGetRTUProducts(
    '',
    true,
    selectedSourceOutletId
  );
  const { data: materials } = useGetRTUMaterials(
    '',
    true,
    undefined,
    selectedSourceOutletId
  );
  const { data: outletsResp } = useGetOutlets(
    0,
    100,
    '',
    false,
    '',
    false,
    true
  );
  const { data: vendorsResp } = useGetRTUVendors('', true);

  const destinationOutletOptions = useMemo(() => {
    const outlets = outletsResp?.data || [];
    return outlets
      .filter((o: any) => o._id !== selectedSourceOutletId)
      .map((o: any) => ({
        label: `${o.label || o.name}${o.region ? ` (${o.region})` : ''}`,
        value: o._id
      }));
  }, [outletsResp?.data, selectedSourceOutletId]);

  const vendorOptions = useMemo(() => {
    const vendors = vendorsResp?.data || [];
    return vendors.map((v: any) => ({
      label: `${v.name} - ${v.code}`,
      value: v._id
    }));
  }, [vendorsResp?.data]);

  const productOptions = useMemo(() => {
    return (products?.data || []).map((p: RTUProduct) => {
      const stock = round(p.currentStock || 0, 2);
      return {
        label: `${p.code ? `${p.code} - ` : ''}${p.name} (Stok: ${stock} ${p.outputUnit || ''})`,
        value: p._id
      };
    });
  }, [products?.data]);

  const materialOptions = useMemo(() => {
    return (materials?.data || []).map((m: RTUMaterial) => {
      const stock = round(m.currentStock || 0, 2);
      const brandStr = m.brand ? ` [Merek: ${m.brand}]` : '';
      return {
        label: `${m.name}${brandStr} (Stok: ${stock} ${m.unit || ''})`,
        value: m._id
      };
    });
  }, [materials?.data]);

  useEffect(() => {
    if (initialValues) {
      const destType =
        initialValues.destinationType ||
        (initialValues.vendorId ? 'VENDOR' : 'OUTLET');
      reset({
        sourceOutletId: initialValues.sourceOutletId || '',
        destinationType: destType,
        outletId: initialValues.outletId || '',
        vendorId: initialValues.vendorId || '',
        type: initialValues.type || 'PRODUCT',
        shipmentDate: initialValues.shipmentDate || '',
        shipmentTime: initialValues.shipmentTime || '07:00',
        notes: initialValues.notes || '',
        items: initialValues.items || [
          { productId: '', materialId: '', qty: 0, unit: '', notes: '' }
        ]
      });
      setDistType(initialValues.type || 'PRODUCT');
    }
  }, [initialValues, reset]);

  const handleTypeChange = (type: 'PRODUCT' | 'MATERIAL') => {
    setDistType(type);
    setValue('type', type);
    setValue('items', [
      { productId: '', materialId: '', qty: 0, unit: '', notes: '' }
    ]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products?.data?.find(
      (p: RTUProduct) => p._id === productId
    );
    if (product) {
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.unit`, product.outputUnit);
    }
  };

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materials?.data?.find(
      (m: RTUMaterial) => m._id === materialId
    );
    if (material) {
      setValue(`items.${index}.materialId`, materialId);
      setValue(`items.${index}.unit`, material.unit);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex-1 overflow-hidden flex flex-col"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-sm border border-gray-100">
            {/* Outlet Asal (Pengirim) - Tetap menggunakan OutletSelector */}
            <div className="space-y-3">
              <OutletSelector
                label="Pilih Outlet Asal"
                placeholder="Pilih outlet asal..."
                value={watch('sourceOutletId') || ''}
                onSelect={(v) => {
                  setValue('sourceOutletId', v, { shouldValidate: true });
                  if (watch('outletId') === v) setValue('outletId', '');
                }}
                required
                autoSelectFirst={!initialValues?.sourceOutletId}
                excludeId={watch('outletId') || ''}
              />
              {errors.sourceOutletId && (
                <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                  {errors.sourceOutletId.message}
                </p>
              )}
            </div>

            {/* Toggle Tujuan Kirim */}
            <ButtonToggle
              height="h-14"
              label="Tujuan Kirim"
              icon={Store}
              value={watch('destinationType')}
              onChange={(val) => {
                const newType = val as 'OUTLET' | 'VENDOR';
                setValue('destinationType', newType);
                if (newType === 'OUTLET') {
                  setValue('vendorId', '');
                } else {
                  setValue('outletId', '');
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

            {/* Conditionally Render Outlet Tujuan vs Vendor Eksternal */}
            {watch('destinationType') === 'OUTLET' ? (
              <div className="space-y-3">
                <ReusableSelect
                  icon={Store}
                  label="Outlet Tujuan (Penerima)"
                  value={watch('outletId') || ''}
                  onChange={(v: string) =>
                    setValue('outletId', v, { shouldValidate: true })
                  }
                  placeholder="Pilih outlet tujuan..."
                  options={destinationOutletOptions}
                  triggerClassName="h-14 border-none shadow-sm bg-white text-gray-900"
                />
                {errors.outletId && (
                  <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                    {errors.outletId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <ReusableSelect
                  icon={Building2}
                  label="Vendor Eksternal"
                  value={watch('vendorId') || ''}
                  onChange={(v: string) =>
                    setValue('vendorId', v, { shouldValidate: true })
                  }
                  placeholder="Pilih vendor..."
                  options={vendorOptions}
                  triggerClassName="h-14 border-none shadow-sm bg-white text-gray-900"
                />
                {errors.vendorId && (
                  <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                    {errors.vendorId.message}
                  </p>
                )}
              </div>
            )}

            {/* Jenis Pengiriman (Produk Jadi vs Bahan Baku) */}
            <ButtonToggle
              height="h-14"
              label="Jenis Pengiriman"
              icon={Layers}
              value={distType}
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
                  activeClassName: 'bg-blue-600 border-blue-600 text-white',
                  hoverClassName: 'hover:border-blue-300'
                },
                {
                  value: 'MATERIAL',
                  label: (
                    <>
                      <Box className="w-4 h-4" /> Bahan Baku
                    </>
                  ),
                  activeClassName: 'bg-amber-500 border-amber-500 text-white',
                  hoverClassName: 'hover:border-amber-300'
                }
              ]}
            />
          </div>

          {/* Shipment Date, Time & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <DatePicker
                  label="Tanggal Kirim"
                  value={watch('shipmentDate')}
                  onChange={(date) =>
                    setValue('shipmentDate', date, { shouldValidate: true })
                  }
                />
                {errors.shipmentDate && (
                  <p className="text-[10px] font-bold text-red-500 uppercase ml-1 italic">
                    {errors.shipmentDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <TimePicker
                  label="Jam Kirim"
                  value={watch('shipmentTime')}
                  onChange={(time) =>
                    setValue('shipmentTime', time, { shouldValidate: true })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center text-xs font-bold text-gray-700 mb-1 ml-1">
                <MapPin className="w-3 h-3 mr-1" /> Catatan Tambahan (Opsional)
              </Label>
              <Input
                {...register('notes')}
                placeholder="Contoh: Kirim pagi sebelum jam 10..."
                className="h-10 bg-white border-gray-200 rounded-sm font-normal text-xs"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm italic">
                  {distType === 'PRODUCT'
                    ? 'Produk yang Dikirim'
                    : 'Material yang Dikirim'}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="rounded-sm text-[10px] font-bold uppercase text-blue-600 hover:bg-blue-50"
                onClick={() =>
                  append({
                    productId: '',
                    materialId: '',
                    qty: 0,
                    unit: '',
                    notes: ''
                  })
                }
              >
                + Tambah Baris
              </Button>
            </div>

            <div className="rounded-sm border border-gray-200 overflow-hidden shadow-sm">
              <Table className="w-full" containerClassName="h-auto">
                <TableHeader className="bg-slate-900">
                  <TableRow className="h-10 border-none hover:bg-transparent">
                    <TableHead className="w-[50px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                      #
                    </TableHead>
                    <TableHead className="min-w-[240px] text-white text-[11px] uppercase tracking-wider font-bold">
                      {distType === 'PRODUCT' ? 'Nama Produk' : 'Nama Material'}
                    </TableHead>
                    <TableHead className="w-[120px] text-white text-[11px] uppercase tracking-wider font-bold text-center">
                      Qty
                    </TableHead>
                    <TableHead className="w-[100px] text-white text-[11px] uppercase tracking-wider font-bold text-center">
                      Unit
                    </TableHead>
                    <TableHead className="w-[200px] text-white text-[11px] uppercase tracking-wider font-bold">
                      Keterangan
                    </TableHead>
                    <TableHead className="w-[100px] text-center text-white text-[11px] uppercase tracking-wider font-bold">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const selectedId =
                      distType === 'PRODUCT'
                        ? watch(`items.${index}.productId`)
                        : watch(`items.${index}.materialId`);

                    const selectedProduct =
                      distType === 'PRODUCT'
                        ? products?.data?.find(
                            (p: RTUProduct) => p._id === selectedId
                          )
                        : undefined;

                    const selectedMaterial =
                      distType === 'MATERIAL'
                        ? materials?.data?.find(
                            (m: RTUMaterial) => m._id === selectedId
                          )
                        : undefined;

                    const selectedItem = selectedProduct || selectedMaterial;
                    const currentStock = round(
                      selectedItem?.currentStock || 0,
                      4
                    );
                    const itemQty = Number(watch(`items.${index}.qty`)) || 0;
                    const isInsufficient =
                      itemQty > 0 && currentStock < itemQty;
                    const unitStr =
                      watch(`items.${index}.unit`) ||
                      (selectedProduct
                        ? selectedProduct.outputUnit
                        : selectedMaterial?.unit) ||
                      '';

                    return (
                      <TableRow
                        key={field.id}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="text-center font-mono text-xs text-gray-400">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          {distType === 'PRODUCT' ? (
                            <ReusableSelect
                              options={productOptions}
                              value={watch(`items.${index}.productId`) || ''}
                              onChange={(v) =>
                                handleProductChange(index, v as string)
                              }
                              placeholder="Pilih produk..."
                              searchable={true}
                              className="w-full"
                              triggerClassName="h-9 text-xs border-gray-200"
                            />
                          ) : (
                            <ReusableSelect
                              options={materialOptions}
                              value={watch(`items.${index}.materialId`) || ''}
                              onChange={(v) =>
                                handleMaterialChange(index, v as string)
                              }
                              placeholder="Pilih material..."
                              searchable={true}
                              className="w-full"
                              triggerClassName="h-9 text-xs border-gray-200"
                            />
                          )}

                          {selectedItem && (
                            <div className="mt-1">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold border',
                                  isInsufficient
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                )}
                              >
                                Stok Tersedia: {currentStock} {unitStr}
                                {isInsufficient && ' (Kurang)'}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <FormInput
                            type="number"
                            step="any"
                            name={`items.${index}.qty`}
                            value={watch(`items.${index}.qty`) ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setValue(
                                `items.${index}.qty`,
                                (val === '' ? '' : Number(val)) as any,
                                { shouldValidate: true, shouldDirty: true }
                              );
                            }}
                            className="h-9 text-xs rounded-sm border-gray-200 bg-white text-center font-normal"
                            containerClassName="mb-0"
                          />
                          <Input
                            type="hidden"
                            {...register(`items.${index}.unit`)}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="bg-gray-100/80 border border-gray-200 rounded-sm h-9 flex items-center justify-center px-2 font-normal text-[9px] text-gray-500">
                            {watch(`items.${index}.unit`) || '-'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Input
                            {...register(`items.${index}.notes`)}
                            placeholder="keterangan..."
                            className="h-9 bg-white border-gray-200 rounded-sm text-xs font-normal"
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                            size="sm"
                            className="h-8 px-3 rounded-sm text-[11px] font-bold uppercase tracking-tighter disabled:opacity-30"
                            icon={Trash2}
                          />
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

      <DialogFooter className="flex-shrink-0 p-8 pt-4 bg-gray-50/50 flex flex-col md:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batalkan
        </Button>
        <Button type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? 'MEMPROSES...' : <>Simpan</>}
        </Button>
      </DialogFooter>
    </form>
  );
}
