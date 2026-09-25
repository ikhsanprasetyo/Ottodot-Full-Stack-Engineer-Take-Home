'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { FormInput } from '@/components/ui/form-input';
import { useGetRTUMaterialPriceHistory } from '@/lib/hooks/queries/rtu-material';
import { RTUMaterial } from '@/lib/type/rtu_material';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { Card } from '@/components/ui/card';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { FadeInList, FadeInItem } from '@/components/animation/fade-in-list';
import { round } from '@/lib/number';
import { useQueryClient } from '@tanstack/react-query';

const formSchema = z.object({
  prices: z.record(z.string(), z.coerce.number().min(0, 'Harga harus positif')),
  vendorId: z.string().optional(),
  source: z.string().default('manual'),
  notes: z.string().optional()
});

export function PriceHistoryDialog({
  material,
  selectedOutletId,
  isOpen,
  onClose
}: {
  material: RTUMaterial;
  selectedOutletId?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Hitung konversi ke base unit secara interaktif/dinamis
   * jika u.conversion = 0 atau missing.
   */
  const buildUnitConversionMap = (
    baseUnit: string,
    materialUnits: any[]
  ): Record<string, number> => {
    const map: Record<string, number> = { [baseUnit]: 1 };

    // Set awal jika conversion > 0
    (materialUnits || []).forEach((u) => {
      if (u.unitName && Number(u.conversion) > 0) {
        map[u.unitName] = Number(u.conversion);
      }
    });

    // Iterasi untuk me-resolve relative conversion (chaining: Dus -> pcs -> L)
    for (let pass = 0; pass < (materialUnits || []).length + 1; pass++) {
      (materialUnits || []).forEach((u) => {
        if (!u.unitName) return;
        const rel = u.relativeToUnit || '';
        const rc = Number(u.relativeConversion) || Number(u.conversion) || 1;
        if (!rel || rel === baseUnit) {
          if (!map[u.unitName] || map[u.unitName] <= 0) {
            map[u.unitName] = rc > 0 ? rc : 1;
          }
        } else if (map[rel] !== undefined && map[rel] > 0) {
          if (!map[u.unitName] || map[u.unitName] <= 0) {
            map[u.unitName] = round(rc * map[rel], 6);
          }
        }
      });
    }

    return map;
  };

  const cMap = buildUnitConversionMap(material.unit, material.units || []);

  // Available units for pricing — kemasan (non-base) pertama, base unit terakhir
  const rawUnits = [
    { unitName: material.unit, conversion: 1, isBase: true },
    ...(material.units || []).map((u: any) => ({
      unitName: u.unitName,
      conversion:
        cMap[u.unitName] && cMap[u.unitName] > 0
          ? cMap[u.unitName]
          : Number(u.conversion) || 1,
      isBase: false
    }))
  ];

  // Sort units: non-base packaging units first (conversion DESC), then base unit
  const units = [...rawUnits].sort((a, b) => {
    if (!a.isBase && b.isBase) return -1;
    if (a.isBase && !b.isBase) return 1;
    return b.conversion - a.conversion;
  });

  /**
   * Anchor Unit = Unit level tertinggi (Dus/Box/pcs).
   * Semua kalkulasi harga didasarkan dari anchor ini.
   */
  const anchorUnit = units[0];

  /**
   * Hitung semua harga dari anchor price (presisi penuh).
   * Untuk IDR: round ke 0 desimal jika bulat, atau hingga 5 desimal jika pecahan mikro.
   */
  const calcAllPricesFromAnchor = (
    anchorPrice: number,
    anchorConversion: number
  ): Record<string, number> => {
    const prices: Record<string, number> = {};
    const safeAnchorConv = anchorConversion > 0 ? anchorConversion : 1;
    units.forEach((u) => {
      const targetConv = u.conversion > 0 ? u.conversion : 1;
      const ratio = targetConv / safeAnchorConv;
      const raw = anchorPrice * ratio;
      prices[u.unitName] =
        u.unitName === anchorUnit.unitName
          ? anchorPrice
          : Math.abs(raw - Math.round(raw)) < 0.0001
            ? Math.round(raw)
            : round(raw, 5);
    });
    return prices;
  };

  /**
   * Hitung anchor price dari base price yang disimpan di DB.
   * Mendukung presisi hingga 5 desimal jika ada pecahan mikro.
   */
  const anchorPriceFromBase = (basePrice: number): number => {
    const raw = basePrice * anchorUnit.conversion;
    return Math.abs(raw - Math.round(raw)) < 0.0001
      ? Math.round(raw)
      : round(raw, 5);
  };

  const [lastModifiedUnit, setLastModifiedUnit] = useState<string>(
    anchorUnit.unitName
  );

  // Fetch history when dialog is open
  const { data: historyData, isFetching } = useGetRTUMaterialPriceHistory(
    isOpen ? material._id : undefined,
    selectedOutletId
  );
  const { data: vendorData } = useGetRTUVendors('', true);

  const historyList = historyData?.data || [];

  const vendorOptions = (vendorData?.data || []).map((v: any) => ({
    value: v._id,
    label: `${v.name} (${v.code})`
  }));

  // Inisialisasi form: anchor price dari currentPrice DB
  const initAnchorPrice = anchorPriceFromBase(material.currentPrice || 0);
  const initialPrices = calcAllPricesFromAnchor(
    initAnchorPrice,
    anchorUnit.conversion
  );

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prices: initialPrices,
      vendorId: material.vendorId || '',
      source: 'manual',
      notes: '',
      _basePriceInternal: material.currentPrice || 0,
      _anchorPriceInternal: initAnchorPrice
    }
  });

  // Register internal state fields agar secara resmi dipantau oleh React Hook Form
  useEffect(() => {
    form.register('_basePriceInternal');
    form.register('_anchorPriceInternal');
  }, [form]);

  useEffect(() => {
    if (isOpen) {
      const ap = anchorPriceFromBase(material.currentPrice || 0);
      form.reset({
        prices: calcAllPricesFromAnchor(ap, anchorUnit.conversion),
        vendorId: material.vendorId || '',
        source: 'manual',
        notes: '',
        _basePriceInternal: material.currentPrice || 0,
        _anchorPriceInternal: ap
      });
      setLastModifiedUnit(anchorUnit.unitName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, material]);

  const handlePriceChange = (changedUnitName: string, value: number) => {
    const changedUnit = units.find((u) => u.unitName === changedUnitName);
    const changedConversion =
      changedUnit && Number(changedUnit.conversion) > 0
        ? Number(changedUnit.conversion)
        : 1;

    setLastModifiedUnit(changedUnitName);

    // Hitung semua harga dengan ratio langsung dari changed unit
    units.forEach((u) => {
      if (u.unitName !== changedUnitName) {
        const targetConv = u.conversion > 0 ? u.conversion : 1;
        const ratio = targetConv / changedConversion;
        const raw = value * ratio;
        const valConv =
          Math.abs(raw - Math.round(raw)) < 0.0001
            ? Math.round(raw)
            : round(raw, 5);
        form.setValue(`prices.${u.unitName}`, valConv, {
          shouldValidate: true,
          shouldDirty: true
        });
      }
    });

    // Pastikan nilai yang diinput tetap exact
    form.setValue(`prices.${changedUnitName}`, value, {
      shouldValidate: true,
      shouldDirty: true
    });

    // Simpan base price presisi penuh untuk submit ke backend
    form.setValue('_basePriceInternal', value / changedConversion, {
      shouldDirty: false
    });
    // Simpan anchor price presisi penuh untuk reset post-save
    const anchorConv = anchorUnit.conversion > 0 ? anchorUnit.conversion : 1;
    form.setValue(
      '_anchorPriceInternal',
      value * (anchorConv / changedConversion),
      { shouldDirty: false }
    );
  };

  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);

      // Ambil nilai internal presisi penuh menggunakan form.getValues()
      // karena values dari Zod resolver menyaring key yang tidak ada di schema
      const basePriceValInternal = form.getValues('_basePriceInternal');
      const anchorPriceValInternal = form.getValues('_anchorPriceInternal');

      const basePriceValue =
        basePriceValInternal != null
          ? basePriceValInternal
          : values.prices[material.unit];

      // Anchor price yang diinput user (exact)
      const savedAnchorPrice =
        anchorPriceValInternal != null
          ? round(anchorPriceValInternal, 2)
          : round(values.prices[anchorUnit.unitName], 2);

      const enteredPrice = values.prices[lastModifiedUnit];

      const appendNotes = values.notes
        ? `${values.notes} (Diinput Rp ${enteredPrice}/${lastModifiedUnit})`
        : `Diinput Rp ${enteredPrice}/${lastModifiedUnit}`;

      await api.put(`/rtu/material/${material._id}/price`, {
        price: basePriceValue,
        vendorId: values.vendorId || undefined,
        outletId: selectedOutletId || undefined,
        source: values.source,
        notes: appendNotes
      });
      toast.success('Harga material berhasil diperbarui');

      // Invalidate agar log historis & harga material auto-refresh
      queryClient.invalidateQueries({
        queryKey: ['rtu-material-price', material._id]
      });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });

      // Reset form dengan anchor price yang tepat (bukan re-konversi dari DB)
      form.reset({
        prices: calcAllPricesFromAnchor(
          savedAnchorPrice,
          anchorUnit.conversion
        ),
        vendorId: values.vendorId || '',
        source: 'manual',
        notes: '',
        _basePriceInternal: basePriceValue,
        _anchorPriceInternal: savedAnchorPrice
      });
      setLastModifiedUnit(anchorUnit.unitName);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal update harga');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency untuk IDR (tanpa desimal nol jika bulat, maksimal 5 desimal untuk pecahan mikro)
  const formatCurrency = (val: number) => {
    if (val === null || val === undefined || isNaN(val)) {
      return 'Rp 0';
    }
    const cleanVal =
      Math.abs(val - Math.round(val)) < 0.0001
        ? Math.round(val)
        : round(val, 5);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 5
    }).format(cleanVal);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-sm p-6 shadow-xl border-t-4 border-amber-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Manajemen Harga Bahan Baku: {material.name}{' '}
            {selectedOutletId && '(Khusus Outlet Terpilih)'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-gray-50 border border-gray-100 rounded-sm p-4 h-fit">
            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">
              Update Harga Saat Ini
            </h3>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3 border-b pb-3 mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Harga per Satuan (Mengkonversi Otomatis)
                </label>
                {/* Anchor unit (Level 1: pcs/botol) tampil pertama dengan highlight */}
                {[
                  anchorUnit,
                  ...units.filter((u) => u.unitName !== anchorUnit.unitName)
                ].map((u) => {
                  const isAnchor = u.unitName === anchorUnit.unitName;
                  return (
                    <div
                      key={u.unitName}
                      className={
                        isAnchor
                          ? 'ring-2 ring-amber-300 rounded-sm p-2 bg-amber-50/50'
                          : ''
                      }
                    >
                      {isAnchor && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                          Patokan Harga Utama
                        </span>
                      )}
                      <FormInput
                        form={form}
                        name={`prices.${u.unitName}`}
                        label={`Harga per ${u.unitName} ${
                          u.isBase
                            ? '(Satuan Dasar)'
                            : `(1 ${u.unitName} = ${u.conversion} ${material.unit})`
                        }`}
                        type="currency"
                        fractionDigits={0}
                        maxFractionDigits={5}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handlePriceChange(u.unitName, val);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <ReusableSelect
                label="Vendor Terkait (Opsional)"
                showDefaultSelect
                value={form.watch('vendorId')}
                onChange={(val) => {
                  form.setValue('vendorId', val, {
                    shouldValidate: true,
                    shouldDirty: true
                  });
                }}
                options={vendorOptions}
                placeholder="-- Kosongkan Jika Umum --"
              />

              <FormInput
                form={form}
                name="notes"
                label="Catatan Survei/Perubahan"
                placeholder="Contoh: Harga promo mingguan"
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm hover:shadow transition-all"
              >
                {isLoading ? 'Menyimpan...' : 'Terapkan Harga & Catat History'}
              </Button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-sm max-h-[400px] overflow-y-auto w-full flex flex-col">
            <div className="sticky top-0 bg-gray-50 border-b p-3 z-10">
              <h3 className="font-semibold text-gray-800 text-sm">
                Log Perubahan Harga Historis
              </h3>
            </div>

            {isFetching ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Memuat data riwayat...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Belum ada riwayat harga.
              </div>
            ) : (
              <FadeInList className="p-4 space-y-3 bg-gray-50/50 flex-1 overflow-y-auto">
                {historyList.map((item: any) => {
                  const displayPrice = item.price * anchorUnit.conversion;
                  const displayUnit = anchorUnit.unitName;

                  return (
                    <FadeInItem key={item._id}>
                      <Card
                        leftBorderColor="border-l-amber-500"
                        className="p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col space-y-2 bg-white cursor-pointer select-none"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-sm text-gray-900">
                            {formatCurrency(displayPrice)}
                            <span className="font-medium text-[10px] text-gray-500 ml-1">
                              /{displayUnit}
                            </span>
                          </span>
                          <span className="text-[11px] font-medium text-gray-500">
                            {new Intl.DateTimeFormat('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(new Date(item.effectiveDate))}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 font-medium">
                          {item.vendor?.name
                            ? `Vendor: ${item.vendor.name}`
                            : 'Vendor: Umum'}
                        </div>

                        {/* Multi-unit prices list */}
                        <div className="bg-slate-50 border border-slate-100/60 rounded-sm p-2 flex flex-col space-y-1 mt-1 text-[11px]">
                          <div className="font-bold text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">
                            Konversi Harga Satuan
                          </div>
                          <div className="flex flex-col space-y-1 font-medium text-gray-600">
                            <div className="flex justify-between border-b border-dashed border-gray-200/80 pb-0.5">
                              <span>Per {material.unit} (Dasar)</span>
                              <span className="font-bold text-gray-800">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                            {(material.units || []).map((u: any) => {
                              const conv =
                                cMap[u.unitName] && cMap[u.unitName] > 0
                                  ? cMap[u.unitName]
                                  : Number(u.conversion) || 1;
                              return (
                                <div
                                  key={u.unitName}
                                  className="flex justify-between border-b border-dashed border-gray-200/80 pb-0.5 last:border-b-0 last:pb-0"
                                >
                                  <span>
                                    Per {u.unitName} (1:{conv})
                                  </span>
                                  <span className="font-bold text-gray-800">
                                    {formatCurrency(item.price * conv)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {item.notes && (
                          <div className="text-[11px] text-gray-500 bg-gray-50/50 border border-gray-100/50 rounded-sm p-2 italic break-words mt-1">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </Card>
                    </FadeInItem>
                  );
                })}
              </FadeInList>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-gray-600 shadow-sm"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
