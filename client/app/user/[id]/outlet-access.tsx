'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function OutletAccessSection({ outlets, value, onSave, isSaving }) {
  const router = useRouter();
  // local draft state (IMPORTANT)
  const [draft, setDraft] = useState(value);

  // sync kalau user ganti tab / reload user
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const { outletAccess } = draft;

  const toggleOutlet = (id) => {
    setDraft((prev: any) => ({
      ...prev,
      outletAccessMode: 'multiple', // Ensure mode is always multiple
      outletAccess: prev.outletAccess.includes(id)
        ? prev.outletAccess.filter((o) => o !== id)
        : [...prev.outletAccess, id]
    }));
  };

  return (
    <div className="border rounded-sm p-4 mb-6 space-y-4">
      <h3 className="font-semibold">Outlet Access</h3>

      {/* OUTLET SELECTION */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {outlets.map((o) => (
          <label
            key={o._id}
            className="flex items-center gap-2 border px-2 py-1 rounded-sm hover:cursor-pointer"
          >
            <input
              type="checkbox"
              checked={outletAccess.includes(o._id)}
              onChange={() => toggleOutlet(o._id)}
            />
            {o.name}
          </label>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => {
            setDraft(value);
            router.push('/users');
          }}
        >
          Cancel
        </Button>
        <Button
          isLoading={isSaving}
          onClick={() => onSave(draft)}
          variant="primary"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
