'use client';

import * as React from 'react';
import { ReusableSelect } from './reusable-select';
import { useGetRTUUnits } from '@/lib/hooks/queries/rtu-unit';

export const UNIT_OPTIONS = [
  { label: 'kg', value: 'kg' },
  { label: 'gr', value: 'gr' },
  { label: 'L', value: 'L' },
  { label: 'ml', value: 'ml' },
  { label: 'pcs', value: 'pcs' }
];

type UnitSelectProps = {
  form?: any;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
  showDefaultSelect?: boolean;
};

export const UnitSelect: React.FC<UnitSelectProps> = ({
  form,
  name = 'unit',
  label = 'Satuan (Unit) *',
  value,
  onChange,
  placeholder = 'Pilih Satuan...',
  error,
  containerClassName = '',
  className = '',
  showDefaultSelect = true
}) => {
  const { data: unitsData } = useGetRTUUnits('', true); // only active units

  const options = React.useMemo(() => {
    if (unitsData?.data && unitsData.data.length > 0) {
      return unitsData.data.map((u: any) => ({
        label: u.name,
        value: u.name
      }));
    }
    return UNIT_OPTIONS;
  }, [unitsData]);

  // If react-hook-form object is provided
  if (form) {
    const selectedValue = form.watch(name);
    const formError = form.formState.errors[name]?.message as
      string | undefined;

    return (
      <div className={`flex flex-col space-y-2 w-full ${containerClassName}`}>
        {label && (
          <label className="text-sm font-medium leading-none text-gray-700">
            {label}
          </label>
        )}
        <ReusableSelect
          showDefaultSelect={showDefaultSelect}
          options={options}
          value={selectedValue}
          onChange={(val) => {
            form.setValue(name, val, {
              shouldValidate: true,
              shouldDirty: true
            });
            form.trigger(name);
          }}
          placeholder={placeholder}
          className={className}
        />
        {formError && <p className="text-xs text-red-500">{formError}</p>}
      </div>
    );
  }

  // Stateless component usage
  return (
    <div className={`flex flex-col space-y-2 w-full ${containerClassName}`}>
      {label && (
        <label className="text-sm font-medium leading-none text-gray-700">
          {label}
        </label>
      )}
      <ReusableSelect
        showDefaultSelect={showDefaultSelect}
        options={options}
        value={value ?? ''}
        onChange={(val) => onChange?.(val)}
        placeholder={placeholder}
        className={className}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
