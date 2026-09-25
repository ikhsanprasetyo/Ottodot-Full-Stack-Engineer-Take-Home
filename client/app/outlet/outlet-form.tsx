'use client';

import { Outlet } from '@/lib/type/outlet';

import { useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { INDONESIA_REGIONS } from '@/lib/constants/indonesia-regions';

type OutletFormProps = {
  values: Partial<Outlet>;
  setValues: (newVal: Partial<Outlet>) => void;
};

export function OutletForm({ values, setValues }: OutletFormProps) {
  const provinceOptions = useMemo(() => {
    return INDONESIA_REGIONS.map((p) => ({
      value: p.name,
      label: p.name
    }));
  }, []);

  const cityOptions = useMemo(() => {
    if (!values.region) return [];
    const province = INDONESIA_REGIONS.find((p) => p.name === values.region);
    if (!province) return [];
    return province.cities.map((c) => ({
      value: c.name,
      label: c.name
    }));
  }, [values.region]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'number') {
      finalValue = value === '' ? 0 : Number(value);
    }
    if (name === 'label') {
      setValues({
        ...values,
        label: value,
        name: value.toLowerCase().replace(/\s+/g, '-') // Convert to lowercase and replace spaces with hyphens for slug
      });
    } else {
      setValues({ [name]: finalValue });
    }
  };

  const handleRegionChange = (val: string) => {
    setValues({
      region: val,
      city: '' // Reset city when region changes
    });
  };

  const handleCityChange = (val: string) => {
    setValues({ city: val });
  };

  const inputClass =
    'w-full border px-3 py-2 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelClass =
    'block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          {/* This is only display name on the backend */}
          <label className={labelClass}>Outlet Name</label>
          <input
            type="text"
            name="label"
            value={values.label || ''}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. Sriwijaya"
            required
          />
        </div>
        <div className="hidden">
          <label className={labelClass}>Outlet Name (Unique Sluggified)</label>
          <input
            type="text"
            name="name"
            value={values.name || ''}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select
            name="type"
            value={values.type || ''}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="">Select Type</option>
            <option value="outlet">Outlet</option>
            <option value="central kitchen">Central Kitchen</option>
            <option value="warehouse">Warehouse</option>
            <option value="head office">HO (Head Office)</option>
            <option value="office">Office</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Abbreviation</label>
          <input
            type="text"
            name="abbreviation"
            value={values.abbreviation || ''}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. SUP"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Region (Province)</label>
          <Combobox
            options={provinceOptions}
            value={values.region || ''}
            onSelect={handleRegionChange}
            placeholder="Select province..."
          />
        </div>
        <div>
          <label className={labelClass}>City / Regency</label>
          <Combobox
            options={cityOptions}
            value={values.city || ''}
            onSelect={handleCityChange}
            placeholder={
              values.region ? 'Select city...' : 'Select province first'
            }
            disabled={!values.region}
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <textarea
            name="address"
            value={values.address || ''}
            onChange={handleChange}
            className={`${inputClass} h-[108px] resize-none`}
            placeholder="Complete address..."
          />
        </div>
      </div>
    </div>
  );
}
