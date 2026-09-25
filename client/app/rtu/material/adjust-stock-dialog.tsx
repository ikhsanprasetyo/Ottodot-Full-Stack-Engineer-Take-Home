'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PackagePlus, Plus, Trash2, Store, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { FormInput } from '@/components/ui/form-input';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { useQueryClient } from '@tanstack/react-query';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { Combobox } from '@/components/ui/combobox';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { UnitConversionCallout } from '@/components/shared/unit-conversion-callout';
import { toIDR } from '@/lib/utils';
import { round } from '@/lib/number';

const formSchema = z
  .object({
    type: z.enum(['IN', 'OUT']),
    outletId: z.string().min(1, 'Cabang wajib dipilih'),
    qty: z.coerce.number().optional(),
    unit: z.string().optional(),
    notes: z.string().optional(),
    inboundItems: z
      .array(
        z.object({
          vendorId: z.string().optional(),
          qty: z.coerce.number().optional(),
          unit: z.string().optional(),
          price: z.coerce.number().optional(),
          notes: z.string().optional()
        })
      )
      .optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === 'OUT') {
      if (!data.qty || data.qty <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kuantitas keluar harus lebih dari 0',
          path: ['qty']
        });
      }
    } else if (data.type === 'IN') {
      if (!data.inboundItems || data.inboundItems.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Harap tambahkan minimal 1 item inbound',
          path: ['inboundItems']
        });
      } else {
        data.inboundItems.forEach((item, index) => {
          if (!item.qty || item.qty < 0.001) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Kuantitas minimal 0.001',
              path: ['inboundItems', index, 'qty']
            });
          }
          if (item.price !== undefined && item.price < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Harga tidak boleh negatif',
              path: ['inboundItems', index, 'price']
            });
          }
        });
      }
    }
  });

export function AdjustStockDialog({
  material,
  defaultOutletId
}: {
  material: RTUMaterial;
  defaultOutletId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendorsData } = useGetRTUVendors();
  const vendorOptions = useMemo(
    () =>
      (vendorsData?.data || []).map((v: any) => ({
        value: v._id,
        label: v.name
      })),
    [vendorsData]
  );

  const { data: outletsData } = useGetOutlets(0, 100);
  const outletOptions = useMemo(
    () =>
      (outletsData?.data || []).map((o: any) => ({
        label: `${o.label || o.name} (${o.type || 'Cabang'})`,
        value: o._id
      })),
    [outletsData]
  );

  // Generates available unit options (base unit + multi-unit conversions)
  const unitOptions = useMemo(() => {
    if (!material) return [];
    const baseUnit = material.unit || 'Pcs';
    const list: { label: string; value: string; conversion: number }[] = [
      {
        label: baseUnit,
        value: baseUnit,
        conversion: 1
      }
    ];

    if (material.units && Array.isArray(material.units)) {
      material.units.forEach((u: any) => {
        if (u.unitName && u.unitName !== baseUnit) {
          list.push({
            label: `${u.unitName} (1 ${u.unitName} = ${u.conversion} ${baseUnit})`,
            value: u.unitName,
            conversion: u.conversion || 1
          });
        }
      });
    }

    return list;
  }, [material]);

  const defaultFormValues = useMemo(
    () => ({
      type: 'IN',
      outletId: defaultOutletId || '',
      qty: 0,
      unit: material.unit || '',
      notes: '',
      inboundItems: [
        {
          vendorId: '',
          qty: 0,
          unit: material.unit || '',
          price: material.currentPrice || 0,
          notes: ''
        }
      ]
    }),
    [defaultOutletId, material]
  );

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'inboundItems'
  });

  const watchType = watch('type');

  useEffect(() => {
    if (open) {
      if (defaultOutletId) {
        setValue('outletId', defaultOutletId);
      } else if (outletOptions.length > 0 && !watch('outletId')) {
        setValue('outletId', outletOptions[0].value);
      }
    }
  }, [open, defaultOutletId, outletOptions, setValue, watch]);

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);

      if (values.type === 'IN') {
        const items = values.inboundItems || [];
        if (items.length === 0) {
          toast.error('Harap tambahkan minimal 1 item inbound');
          return;
        }

        // Jalankan semua penyesuaian stok secara paralel
        const promises = items.map(async (item: any) => {
          const selectedUnit = item.unit || material.unit;
          const matchOpt = unitOptions.find((o) => o.value === selectedUnit);
          const conversionFactor = matchOpt?.conversion || 1;

          // Convert quantity and price to base unit values
          const baseQty = round((item.qty || 0) * conversionFactor, 4);
          const basePrice =
            item.price > 0 ? round((item.price || 0) / conversionFactor, 4) : 0;

          const unitDetail =
            selectedUnit !== material.unit
              ? ` [${item.qty} ${selectedUnit} @ ${toIDR(item.price || 0)}]`
              : '';
          const noteText = (item.notes || 'Inbound stok manual') + unitDetail;

          // 1. Post penyesuaian stok
          await api.post(`/rtu/material/${material._id}/stock-adjust`, {
            qty: baseQty,
            movementType: 'IN',
            outletId: values.outletId,
            notes: noteText
          });

          // 2. Jika ada vendor dan harga beli dimasukkan, update histori harga global
          if (item.vendorId && item.price > 0) {
            await api.put(`/rtu/material/${material._id}/price`, {
              price: basePrice,
              vendorId: item.vendorId,
              source: 'manual',
              notes: noteText
            });
          }
        });

        await Promise.all(promises);
      } else {
        const selectedUnit = values.unit || material.unit;
        const matchOpt = unitOptions.find((o) => o.value === selectedUnit);
        const conversionFactor = matchOpt?.conversion || 1;

        const baseQty = -Math.abs(
          round((values.qty || 0) * conversionFactor, 4)
        );
        const unitDetail =
          selectedUnit !== material.unit
            ? ` [${values.qty} ${selectedUnit}]`
            : '';
        const noteText = (values.notes || 'Outbound stok manual') + unitDetail;

        await api.post(`/rtu/material/${material._id}/stock-adjust`, {
          qty: baseQty,
          movementType: 'OUT',
          outletId: values.outletId,
          notes: noteText
        });
      }

      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-stock-ledgers'] });
      toast.success('Stok berhasil disesuaikan!');
      setOpen(false);

      // Reset form ke state default
      form.reset(defaultFormValues);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menyesuaikan stok');
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    if (errors.qty?.message) {
      toast.error(errors.qty.message);
    } else if (errors.outletId?.message) {
      toast.error('Cabang wajib dipilih');
    } else if (errors.inboundItems) {
      toast.error('Harap lengkapi kuantitas inbound dengan benar');
    } else {
      toast.error('Harap lengkapi semua field bertanda *');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          form.reset(defaultFormValues);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <PackagePlus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white rounded-sm p-6 shadow-xl border-t-4 border-emerald-500 max-w-4xl min-h-[540px] flex flex-col justify-between transition-all duration-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Sesuaikan Stok Aktual
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-1">
            Mencatat perubahan manual terhadap saldo kartu stok{' '}
            <b>{material.name}</b>. Saat ini:{' '}
            <span className="font-bold text-brand-500">
              {material.currentStock} {material.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="py-4 mt-2 flex-1 flex flex-col justify-between"
        >
          <div className="space-y-4 flex-1">
            {/* Header Row: Cabang (Atas Kiri) & Tipe Pergerakan (Atas Kanan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <ReusableSelect
                  icon={Store}
                  label="Cabang *"
                  value={watch('outletId') || defaultOutletId || ''}
                  onChange={(val: string) =>
                    setValue('outletId', val, { shouldValidate: true })
                  }
                  placeholder="Pilih Cabang..."
                  options={outletOptions}
                  searchable={true}
                  disabled={true}
                  triggerClassName="h-10 text-xs border-gray-300 bg-gray-100/80 cursor-not-allowed opacity-90"
                />
                {errors.outletId && (
                  <p className="text-[10px] text-red-500 font-bold uppercase italic mt-0.5">
                    {errors.outletId.message as string}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-1">
                <ReusableSelect
                  icon={Layers}
                  label="Tipe Pergerakan *"
                  value={watch('type') || 'IN'}
                  onChange={(val: string) =>
                    setValue('type', val, { shouldValidate: true })
                  }
                  options={[
                    { label: 'Masuk (Inbound / Tambah Stok)', value: 'IN' },
                    { label: 'Keluar (Outbound / Kurangi Stok)', value: 'OUT' }
                  ]}
                  triggerClassName="h-10 text-xs border-gray-300 bg-white"
                />
              </div>
            </div>

            {watchType === 'IN' ? (
              <div className="space-y-4 mt-2 border-t pt-4 border-gray-100">
                <div className="flex justify-between items-center pb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Daftar Inbound Bahan Baku
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        vendorId: '',
                        qty: 0,
                        unit: material.unit || '',
                        price: material.currentPrice || 0,
                        notes: ''
                      })
                    }
                    className="text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1 rounded-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Baris
                  </Button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 bg-gray-50/70 rounded-sm border border-gray-200/60 relative space-y-3 shadow-sm hover:border-gray-300 transition-colors"
                    >
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="flex flex-col space-y-1.5 sm:col-span-4">
                          <label className="text-xs font-bold text-gray-600">
                            Vendor (Supplier)
                          </label>
                          <Combobox
                            options={vendorOptions}
                            value={watch(`inboundItems.${index}.vendorId`)}
                            onSelect={(val) =>
                              setValue(`inboundItems.${index}.vendorId`, val)
                            }
                            placeholder="Pilih Vendor..."
                            className="h-9 w-full rounded-sm bg-white"
                          />
                        </div>

                        <FormInput
                          form={form}
                          name={`inboundItems.${index}.qty`}
                          label="Jumlah *"
                          type="number"
                          step="any"
                          placeholder="0"
                          containerClassName="mb-0"
                          className="h-9 text-xs rounded-sm bg-white text-gray-800 font-normal"
                        />

                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-bold text-gray-600 mb-1">
                            Satuan
                          </label>
                          <ReusableSelect
                            value={
                              watch(`inboundItems.${index}.unit`) ||
                              material.unit
                            }
                            onChange={(val: string) => {
                              setValue(`inboundItems.${index}.unit`, val);
                              const matchOpt = unitOptions.find(
                                (u) => u.value === val
                              );
                              const conv = matchOpt?.conversion || 1;
                              const defaultPriceForUnit = round(
                                (material.currentPrice || 0) * conv,
                                2
                              );
                              setValue(
                                `inboundItems.${index}.price`,
                                defaultPriceForUnit
                              );
                            }}
                            options={unitOptions}
                            className="text-xs"
                            triggerClassName="h-9 text-xs border-gray-200 bg-white"
                          />
                        </div>

                        <FormInput
                          form={form}
                          name={`inboundItems.${index}.price`}
                          label={`Harga Beli per ${
                            watch(`inboundItems.${index}.unit`) ||
                            material.unit ||
                            'Satuan'
                          } (Rp)`}
                          type="number"
                          step="any"
                          placeholder="0"
                          containerClassName="mb-0"
                          className="h-9 text-xs rounded-sm bg-white text-gray-800 font-normal"
                        />

                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-bold text-gray-600 mb-1">
                            Subtotal (Rp)
                          </label>
                          <div className="h-9 rounded-sm bg-emerald-50/60 border border-emerald-100 px-3 flex items-center justify-end font-bold text-xs text-emerald-700">
                            {toIDR(
                              round(
                                (watch(`inboundItems.${index}.qty`) || 0) *
                                  (watch(`inboundItems.${index}.price`) || 0),
                                2
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <FormInput
                        form={form}
                        name={`inboundItems.${index}.notes`}
                        label="Catatan"
                        type="text"
                        placeholder="Keterangan (opsional)"
                        containerClassName="mb-0"
                        className="h-9 text-xs rounded-sm bg-white text-gray-800 font-normal"
                      />

                      <UnitConversionCallout
                        qty={Number(watch(`inboundItems.${index}.qty`)) || 0}
                        selectedUnit={
                          watch(`inboundItems.${index}.unit`) || material.unit
                        }
                        baseUnit={material.unit || 'Pcs'}
                        conversion={
                          unitOptions.find(
                            (u) =>
                              u.value ===
                              (watch(`inboundItems.${index}.unit`) ||
                                material.unit)
                          )?.conversion || 1
                        }
                        unitPrice={
                          Number(watch(`inboundItems.${index}.price`)) || 0
                        }
                        mode="IN"
                      />
                    </div>
                  ))}
                </div>

                {/* Total Estimasi Biaya Inbound Card */}
                <div className="flex items-center justify-between bg-emerald-50/90 px-4 py-3 rounded-sm border border-emerald-200/80 shadow-xs mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Total Estimasi Biaya Inbound
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      ({(watch('inboundItems') || []).length} Baris)
                    </span>
                  </div>
                  <span className="text-base font-bold text-emerald-700">
                    {toIDR(
                      (watch('inboundItems') || []).reduce(
                        (sum: number, item: any) =>
                          sum + round((item?.qty || 0) * (item?.price || 0), 2),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    form={form}
                    name="qty"
                    label="Jumlah *"
                    type="number"
                  />

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 mb-1">
                      Satuan
                    </label>
                    <ReusableSelect
                      value={watch('unit') || material.unit}
                      onChange={(val: string) => setValue('unit', val)}
                      options={unitOptions}
                      className="text-xs"
                      triggerClassName="h-10 text-xs border-gray-200 bg-white"
                    />
                  </div>
                </div>

                {/* Smart Multi-Unit Conversion Callout for Outbound */}
                <UnitConversionCallout
                  qty={Number(watch('qty')) || 0}
                  selectedUnit={watch('unit') || material.unit}
                  baseUnit={material.unit || 'Pcs'}
                  conversion={
                    unitOptions.find(
                      (u) => u.value === (watch('unit') || material.unit)
                    )?.conversion || 1
                  }
                  mode="OUT"
                />

                <FormInput
                  form={form}
                  name="notes"
                  label="Catatan Audit / Keterangan Masalah"
                  placeholder="Barang retur, basi, audit qty, dll"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6 border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset(defaultFormValues);
              }}
              className="text-gray-600 rounded-sm"
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm text-white md:w-32 rounded-sm"
            >
              {isLoading ? 'Loading...' : 'Eksekusi Stok'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
