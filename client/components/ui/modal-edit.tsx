// components/EditModal.tsx
'use client';

import { X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Button } from './button';

type EditModalProps<T> = {
  title?: string;
  item: T;
  onClose: () => void;
  onSubmit: (values: T, helpers: { setIsSaving: (v: boolean) => void }) => void;
  renderForm: (values: T, setValues: (newVal: Partial<T>) => void) => ReactNode;
};

export function ModalEdit<T>({
  title = 'Edit Item',
  item,
  onClose,
  onSubmit,
  renderForm
}: EditModalProps<T>) {
  const [values, setValues] = useState<T>(item);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (newPartial: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newPartial }));
  };

  const handleSave = () => {
    setIsSaving(true);
    onSubmit(values, {
      setIsSaving
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-sm p-6 w-full max-w-5xl shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>

        <div className="space-y-4">
          {renderForm(values, handleChange)}
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
