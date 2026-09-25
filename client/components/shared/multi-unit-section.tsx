'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { useGetRTUUnits } from '@/lib/hooks/queries/rtu-unit';
import { ConversionPreviewHub } from '@/components/shared/conversion-preview-hub';
import { round } from '@/lib/number';
import { UNIT_LEVELS } from '@/lib/type/rtu_unit';

export interface MultiUnitSectionProps {
  form: UseFormReturn<any>;
  baseUnitFieldName?: string;
  showConversionPreview?: boolean;
  fieldArrayName?: string;
}

export function MultiUnitSection({
  form,
  baseUnitFieldName = 'unit',
  showConversionPreview = true,
  fieldArrayName = 'units'
}: MultiUnitSectionProps) {
  const { data: unitsListData } = useGetRTUUnits('', true);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldArrayName
  });

  const baseUnit: string = form.watch(baseUnitFieldName) || 'Satuan Dasar';
  const unitsWatch: any[] = form.watch(fieldArrayName) || [];
  // Semua unit dari master, termasuk data level
  const allUnitsData: any[] = unitsListData?.data || [];

  /**
   * Filter unit yang tersedia untuk Nama Satuan dropdown di baris index.
   * Baris index N → hanya tampilkan unit dengan level = N + 1
   * (index 0 = level 1: pcs/botol, index 1 = level 2: Dus/Box, dst.)
   * Jika tidak ada unit di level tersebut, tampilkan semua (fallback).
   */
  const getUnitOptionsForIndex = (index: number) => {
    const filtered = allUnitsData.filter((u: any) => {
      if (index === 0) {
        return u.level === 1;
      } else {
        return u.level >= 2;
      }
    });
    const pool = filtered.length > 0 ? filtered : allUnitsData;
    return pool.map((u: any) => ({ label: u.name, value: u.name }));
  };

  const getLevelLabel = (index: number, selectedUnitName?: string) => {
    if (index === 0) {
      const lvl = UNIT_LEVELS.find((l) => l.value === 1);
      return lvl ? `${lvl.label} — ${lvl.example}` : '';
    }

    if (selectedUnitName) {
      const matchedUnit = allUnitsData.find((u) => u.name === selectedUnitName);
      if (matchedUnit) {
        const lvl = UNIT_LEVELS.find((l) => l.value === matchedUnit.level);
        if (lvl) return `${lvl.label} — ${lvl.example}`;
      }
    }

    return 'Satuan Grosir / Bundel — Dus, Box, Karton, Pallet';
  };

  const getLevelBadgeInfo = (index: number, selectedUnitName?: string) => {
    if (index === 0) {
      const lvl = UNIT_LEVELS.find((l) => l.value === 1);
      return {
        label: 'L1',
        color: lvl?.color || 'bg-blue-100 text-blue-700'
      };
    }

    if (selectedUnitName) {
      const matchedUnit = allUnitsData.find((u) => u.name === selectedUnitName);
      if (matchedUnit) {
        const lvl = UNIT_LEVELS.find((l) => l.value === matchedUnit.level);
        if (lvl) {
          return {
            label: `L${matchedUnit.level}`,
            color: lvl.color
          };
        }
      }
    }

    return {
      label: 'L2+',
      color: 'bg-amber-100 text-amber-700'
    };
  };

  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const normalized = String(val).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const buildConversionMap = (watchedUnits: any[]): Record<string, number> => {
    const map: Record<string, number> = { [baseUnit]: 1 };
    for (let pass = 0; pass < watchedUnits.length + 1; pass++) {
      for (const u of watchedUnits) {
        if (!u?.unitName) continue;
        const rel = u.relativeToUnit || '';
        const rc = parseNum(u.relativeConversion);
        if (!rel || rel === baseUnit) {
          map[u.unitName] = rc;
        } else if (map[rel] !== undefined) {
          map[u.unitName] = round(rc * map[rel], 6);
        }
      }
    }
    return map;
  };

  const recalcAll = (updatedUnits: any[]) => {
    const map = buildConversionMap(updatedUnits);
    updatedUnits.forEach((u, idx) => {
      if (!u?.unitName) return;
      const finalVal = map[u.unitName] ?? 0;
      form.setValue(fieldArrayName + '.' + idx + '.conversion', finalVal, {
        shouldDirty: true
      });
    });
  };

  const handleRelativeConversionChange = (index: number, value: any) => {
    const updated = unitsWatch.map((u: any, i: number) =>
      i === index ? { ...u, relativeConversion: value } : u
    );
    form.setValue(fieldArrayName + '.' + index + '.relativeConversion', value, {
      shouldDirty: true
    });
    recalcAll(updated);
  };

  const handleRelativeToUnitChange = (index: number, value: string) => {
    const updated = unitsWatch.map((u: any, i: number) =>
      i === index ? { ...u, relativeToUnit: value } : u
    );
    form.setValue(fieldArrayName + '.' + index + '.relativeToUnit', value, {
      shouldDirty: true
    });
    recalcAll(updated);
  };

  // Hanya tampilkan unit dari baris DI ATAS index ini (0..index-1)
  // sehingga tercipta chain linear: base → pcs → Dus → Container
  // Jika index > 0: hilangkan opsi "Satuan Dasar" — wajib pilih unit dari baris atas
  const getRelativeToOptions = (currentIndex: number) => {
    const opts: { label: string; value: string }[] = [];

    // Baris 0: hanya bisa ke Satuan Dasar (tidak ada unit di atasnya)
    // Baris 1+: tidak boleh ke Satuan Dasar jika sudah ada unit di atas
    if (currentIndex === 0) {
      opts.push({ label: baseUnit + ' (Satuan Dasar)', value: '' });
    }

    for (let i = 0; i < currentIndex; i++) {
      const u = unitsWatch[i];
      if (u?.unitName) {
        opts.push({ label: u.unitName, value: u.unitName });
      }
    }

    return opts;
  };

  const cMap = buildConversionMap(unitsWatch);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-sm p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">
            Multi Satuan (Opsional)
          </h3>
          <p className="text-xs text-gray-500">
            Tambahkan satuan konversi — Misal: 1 Pcs = 600 ml, 1 Dus = 48 Pcs
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => {
            // Auto-set relativeToUnit ke unit terakhir yang sudah ada (bukan base)
            // sehingga chain terbentuk natural: pcs → Dus → Container
            const lastUnit =
              unitsWatch.length > 0
                ? unitsWatch[unitsWatch.length - 1]?.unitName || ''
                : '';
            append({
              unitName: '',
              relativeConversion: 1,
              relativeToUnit: lastUnit,
              conversion: 0,
              barcode: ''
            });
          }}
        >
          <Plus className="h-4 w-4" /> Tambah Satuan
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_1fr_auto_auto] gap-2 items-center mb-1 px-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Nama Satuan
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase text-center px-1">
            =
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">
            Jumlah
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Terhadap Satuan
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
            = Satuan Dasar
          </span>
          <span className="w-9" />
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => {
          const currentUnitName = unitsWatch[index]?.unitName || '';
          const currentRelTo = unitsWatch[index]?.relativeToUnit || '';
          const finalConversion = cMap[currentUnitName] ?? 0;

          return (
            <div key={field.id} className="space-y-1">
              {/* Level hint label */}
              {getLevelLabel(index, currentUnitName) && (
                <p className="text-[10px] text-gray-400 px-1">
                  <span
                    className={`inline-block font-bold px-1 rounded-sm mr-1 ${
                      getLevelBadgeInfo(index, currentUnitName).color
                    }`}
                  >
                    {getLevelBadgeInfo(index, currentUnitName).label}
                  </span>
                  {getLevelLabel(index, currentUnitName)}
                </p>
              )}
              <div className="grid grid-cols-[1fr_auto_auto_1fr_auto_auto] gap-2 items-center bg-white p-3 border border-gray-100 shadow-sm rounded-sm">
                <ReusableSelect
                  showDefaultSelect
                  options={getUnitOptionsForIndex(index)}
                  value={form.watch(fieldArrayName + '.' + index + '.unitName')}
                  onChange={(val) =>
                    form.setValue(
                      fieldArrayName + '.' + index + '.unitName',
                      val,
                      { shouldValidate: true, shouldDirty: true }
                    )
                  }
                  placeholder="Pilih Satuan..."
                />

                <span className="text-sm font-medium text-gray-300 px-1">
                  =
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    unitsWatch[index]?.relativeConversion !== undefined &&
                    unitsWatch[index]?.relativeConversion !== null
                      ? String(unitsWatch[index]?.relativeConversion)
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      handleRelativeConversionChange(index, val);
                    }
                  }}
                  onBlur={() => {
                    const raw = String(
                      unitsWatch[index]?.relativeConversion ?? ''
                    );
                    if (raw === '' || raw === '.' || raw === ',') {
                      handleRelativeConversionChange(index, 1);
                      return;
                    }
                    let cleaned = raw;
                    if (cleaned.endsWith('.') || cleaned.endsWith(',')) {
                      cleaned = cleaned.slice(0, -1);
                    }
                    const num = parseFloat(cleaned.replace(',', '.'));
                    if (isNaN(num) || num <= 0) {
                      handleRelativeConversionChange(index, 1);
                    } else {
                      handleRelativeConversionChange(index, num);
                    }
                  }}
                  className="w-20 h-10 border border-gray-200 rounded-sm px-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 font-mono"
                  placeholder="1"
                />

                <ReusableSelect
                  showDefaultSelect={false}
                  options={getRelativeToOptions(index)}
                  value={currentRelTo}
                  onChange={(val) => handleRelativeToUnitChange(index, val)}
                  placeholder={baseUnit + ' (Dasar)'}
                />

                <div className="text-right min-w-[80px]">
                  {finalConversion > 0 ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-sm px-1.5 py-0.5 whitespace-nowrap">
                      {finalConversion.toLocaleString('id-ID', {
                        maximumFractionDigits: 6
                      })}{' '}
                      {baseUnit}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-9 w-9"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="text-center py-4 text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-sm">
            Belum ada satuan tambahan. Klik &quot;+ Tambah Satuan&quot; untuk
            menambah.
          </div>
        )}

        {showConversionPreview && (
          <ConversionPreviewHub
            baseUnit={baseUnit}
            units={unitsWatch.map((u: any) => ({
              unitName: u?.unitName || '',
              conversion: cMap[u?.unitName] ?? 0,
              relativeToUnit: u?.relativeToUnit || '',
              relativeConversion: Number(u?.relativeConversion) || 0
            }))}
          />
        )}
      </div>
    </div>
  );
}
