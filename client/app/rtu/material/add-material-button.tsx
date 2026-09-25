'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { FormInput } from '@/components/ui/form-input';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { Authorized } from '@/components/ui/authorized';
import { UnitSelect } from '@/components/ui/unit-select';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiUnitSection } from '@/components/shared/multi-unit-section';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { Plus } from 'lucide-react';

const formSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  brand: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, 'Unit required'),
  vendorId: z.string().optional(),
  minStock: z.coerce.number().min(0, 'Must be positive').default(0),
  minStockInput: z.coerce.number().min(0, 'Must be positive').default(0),
  minStockUnit: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
  units: z
    .array(
      z.object({
        unitName: z.string().min(1, 'Required'),
        relativeConversion: z.preprocess((val) => {
          if (typeof val === 'string') {
            const normalized = val.replace(',', '.');
            const parsed = parseFloat(normalized);
            return isNaN(parsed) ? val : parsed;
          }
          return val;
        }, z.number().min(0.000001, 'Must be positive').default(1)),
        relativeToUnit: z.string().optional(),
        conversion: z.coerce.number().default(0), // final to base, calculated auto
        barcode: z.string().optional()
      })
    )
    .default([])
});

export function AddMaterialButton() {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendorData } = useGetRTUVendors('', true); // only active vendors
  const { data: categoryData } = useGetRTUCategories('', true); // only active categories

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      brand: '',
      category: '',
      unit: '',
      vendorId: '',
      minStock: 0,
      minStockInput: 0,
      minStockUnit: '',
      description: '',
      barcode: '',
      imageUrl: '',
      units: []
    }
  });

  const unit = form.watch('unit');
  const minStockUnit = form.watch('minStockUnit');

  const currentUnits = useWatch({
    control: form.control,
    name: 'units',
    defaultValue: []
  });

  // Sync minStockUnit if base unit changes for the first time
  useEffect(() => {
    if (unit && !minStockUnit) {
      form.setValue('minStockUnit', unit);
    }
  }, [unit, minStockUnit, form]);

  const minStockUnitOptions = useMemo(() => {
    const opts = [{ label: unit || 'Unit', value: unit || '' }];
    currentUnits.forEach((u: any) => {
      if (u.unitName) {
        opts.push({ label: u.unitName, value: u.unitName });
      }
    });
    return opts;
  }, [unit, currentUnits]);

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);

      let finalMinStock = Number(values.minStockInput) || 0;
      const selectedUnitName = values.minStockUnit;
      if (selectedUnitName && selectedUnitName !== values.unit) {
        const matchedUnit = values.units?.find(
          (u: any) => u.unitName === selectedUnitName
        );
        if (matchedUnit) {
          finalMinStock = finalMinStock * (matchedUnit.conversion || 1);
        }
      }

      await api.post('/rtu/material', {
        ...values,
        minStock: finalMinStock,
        vendorId: values.vendorId || undefined // parse empty string as undefined
      });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      toast.success('Material berhasil ditambahkan');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal merekam Material');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreate) return null;

  return (
    <Authorized action="create">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="primary" icon={Plus}>
            Tambah Bahan Baku
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white rounded-sm shadow-xl border-t-4 border-emerald-500">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-gray-800">
              Tambah Bahan Baku Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="code"
                  label="Kode Material *"
                  placeholder="MAT-001"
                />
                <FormInput
                  form={form}
                  name="name"
                  label="Nama Bahan Baku *"
                  placeholder="Daging Sapi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <UnitSelect form={form} name="unit" label="Satuan Dasar *" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium leading-none text-gray-700">
                    Kategori
                  </label>
                  <ReusableSelect
                    showDefaultSelect
                    options={
                      categoryData?.data?.map((c: any) => ({
                        label: c.name,
                        value: c.name
                      })) || []
                    }
                    value={form.watch('category')}
                    onChange={(val) => {
                      form.setValue('category', val, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                    }}
                    placeholder="Pilih Kategori..."
                  />
                </div>
                <FormInput
                  form={form}
                  name="brand"
                  label="Merek (Brand)"
                  placeholder="Misal: Bango, ABC, dll."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2 col-span-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700">
                    Vendor / Supplier
                  </label>
                  <select
                    {...form.register('vendorId')}
                    className="flex h-10 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="">Pilih Vendor (Opsional)</option>
                    {vendorData?.data?.map((v: any) => (
                      <option key={v._id} value={v._id}>
                        {v.name} ({v.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <FormInput
                form={form}
                name="description"
                label="Deskripsi / Catatan Khusus"
                placeholder="Simpan di suhu -18 derajat"
                rows={2}
              />

              <ImageUpload
                value={form.watch('imageUrl')}
                onChange={(url) => form.setValue('imageUrl', url)}
              />

              {/* MULTI SATUAN SECTION */}
              <MultiUnitSection form={form} baseUnitFieldName="unit" />

              {/* MINIMUM STOCK SECTION */}
              <div className="bg-white p-4 border border-gray-200 rounded-sm space-y-2 mt-4 shadow-sm">
                <label className="text-sm font-bold text-gray-700 block">
                  Minimum Stock Alert *
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <FormInput
                      form={form}
                      name="minStockInput"
                      type="number"
                      placeholder="Masukkan jumlah stok minimum..."
                      containerClassName="mb-0"
                    />
                  </div>
                  <div className="w-48">
                    <ReusableSelect
                      showDefaultSelect={false}
                      options={minStockUnitOptions}
                      value={form.watch('minStockUnit')}
                      onChange={(val) => {
                        form.setValue('minStockUnit', val, {
                          shouldDirty: true
                        });
                      }}
                      placeholder="Pilih Satuan..."
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Sistem akan memunculkan peringatan jika sisa stok di outlet
                  kurang dari nilai ini.
                  {form.watch('minStockUnit') !== form.watch('unit') && (
                    <span className="text-emerald-600 block mt-0.5 font-semibold">
                      * Ekuivalen dengan{' '}
                      <b>
                        {(
                          Number(form.watch('minStockInput') || 0) *
                          (form
                            .watch('units')
                            ?.find(
                              (u: any) =>
                                u.unitName === form.watch('minStockUnit')
                            )?.conversion || 1)
                        ).toLocaleString('id-ID', {
                          maximumFractionDigits: 6
                        })}{' '}
                        {form.watch('unit')}
                      </b>{' '}
                      (Satuan Dasar).
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 rounded-b-sm shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm text-white"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Material'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Authorized>
  );
}
