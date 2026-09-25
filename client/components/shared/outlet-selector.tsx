'use client';

import { useMemo, useEffect } from 'react';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { useGetRTUVendors } from '@/lib/hooks/queries/rtu-vendor';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { Store } from 'lucide-react';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isString
} from '@/lib/localStorage';

interface OutletSelectorProps {
  value: string;
  onSelect: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  autoSelectFirst?: boolean;
  allowAll?: boolean;
  filterType?: string;
  includeVendors?: boolean;
  save?: boolean;
  saveKey?: string;
  excludeId?: string;
}

export function OutletSelector({
  value,
  onSelect,
  label = 'Cabang',
  placeholder = 'Pilih Cabang...',
  disabled = false,
  className,
  required = false,
  autoSelectFirst = false,
  allowAll = false,
  filterType,
  includeVendors = false,
  save = false,
  saveKey,
  excludeId
}: OutletSelectorProps) {
  const { data: outletsData, isLoading: isOutletsLoading } = useGetOutlets(
    0,
    50,
    '',
    false,
    'name',
    false
  );

  const { data: vendorsData, isLoading: isVendorsLoading } = useGetRTUVendors(
    '',
    true
  );

  const options = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const cleanExcludeId = excludeId
      ? excludeId.replace(/^(seller|vendor):/, '')
      : '';

    // Add external vendors first
    if (includeVendors && vendorsData?.data) {
      let filteredVendors = [...vendorsData.data];
      if (cleanExcludeId) {
        filteredVendors = filteredVendors.filter(
          (vendor: any) => vendor._id !== cleanExcludeId
        );
      }
      filteredVendors.sort((a: any, b: any) => {
        const regA = a.region || '';
        const regB = b.region || '';
        if (regA !== regB) {
          return regB.localeCompare(regA); // region Z to A
        }
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB); // name A to Z
      });
      filteredVendors.forEach((vendor: any) => {
        list.push({
          value: `vendor:${vendor._id}`,
          label: `${vendor.name} (Vendor)`
        });
      });
    }

    // Add internal outlets second
    if (outletsData?.data) {
      let filteredOutlets = [...outletsData.data];
      if (filterType) {
        filteredOutlets = filteredOutlets.filter(
          (outlet: any) => outlet.type === filterType
        );
      }
      if (cleanExcludeId) {
        filteredOutlets = filteredOutlets.filter(
          (outlet: any) => outlet._id !== cleanExcludeId
        );
      }
      filteredOutlets.sort((a: any, b: any) => {
        const regA = a.region || '';
        const regB = b.region || '';
        if (regA !== regB) {
          return regB.localeCompare(regA); // region Z to A
        }
        const nameA = a.label || a.name || '';
        const nameB = b.label || b.name || '';
        return nameA.localeCompare(nameB); // name A to Z
      });
      filteredOutlets.forEach((outlet: any) => {
        list.push({
          value: includeVendors ? `seller:${outlet._id}` : outlet._id,
          label: `${outlet.label} (${outlet.region || 'Cabang'})`
        });
      });
    }

    if (allowAll) {
      const allLabel = includeVendors
        ? 'Semua Penjual / Vendor'
        : 'Semua Cabang';
      return [{ value: 'all', label: allLabel }, ...list];
    }

    return list;
  }, [
    outletsData,
    vendorsData,
    allowAll,
    filterType,
    includeVendors,
    excludeId
  ]);

  // Auto-select: prioritize user.outlet, fallback to first in list
  useEffect(() => {
    if (autoSelectFirst && options.length > 0 && !value) {
      const userOutletId = getUserFromStorage()?.outlet;
      const userOption = userOutletId
        ? options.find((o) => o.value === userOutletId)
        : null;
      onSelect(userOption ? userOption.value : options[0].value);
    }
  }, [autoSelectFirst, options, value, onSelect]);

  // Load saved setting on mount
  useEffect(() => {
    if (!save) return;
    if (typeof window === 'undefined') return;
    const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
    const key = saveKey || 'outlet';
    const saved = getLocalStorageSettings(pageKey, key, isString);
    if (saved && saved !== value) {
      onSelect(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, saveKey, onSelect]);

  const isLoading = isOutletsLoading || (includeVendors && isVendorsLoading);

  return (
    <div className={className}>
      {label && (
        <Label
          className={cn(
            'flex items-center text-xs font-bold text-gray-700 mb-1',
            required &&
              "after:content-['*'] after:ml-0.5 after:text-red-500 ml-1"
          )}
        >
          <Store className="w-3 h-3" /> {label}
        </Label>
      )}
      <Combobox
        options={options}
        value={value}
        onSelect={(newVal) => {
          onSelect(newVal);
          if (save) {
            const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
            const key = saveKey || 'outlet';
            updateLocalStorageSettings(pageKey, key, newVal);
          }
        }}
        placeholder={isLoading ? 'Loading data...' : placeholder}
        disabled={disabled || isLoading}
        emptyMessage="Pilihan tidak ditemukan."
      />
    </div>
  );
}
