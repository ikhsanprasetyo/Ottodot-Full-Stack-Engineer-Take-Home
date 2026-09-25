import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateRTUDistribution } from '@/lib/hooks/queries/rtu-distribution';
import dayjs from 'dayjs';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { DistributionForm, DistributionFormValues } from './distribution-form';

export function AddDistributionDialog({
  destinationOptions
}: {
  destinationOptions?: any[];
}) {
  const { hasPermission: canCreate } = useGetPermission('create');
  const [open, setOpen] = useState(false);
  const createMutation = useCreateRTUDistribution();

  const onSubmit = async (data: DistributionFormValues) => {
    // Combine date and time
    const timeStr = data.shipmentTime || '07:00';
    const combinedDateTime = dayjs(
      `${data.shipmentDate}T${timeStr}:00`
    ).toISOString();

    let finalOutletId: string | undefined = undefined;
    let finalVendorId: string | undefined = undefined;

    if (data.destinationType === 'VENDOR') {
      finalVendorId = data.vendorId;
    } else {
      finalOutletId = data.outletId;
    }

    const payload: any = {
      sourceOutletId: data.sourceOutletId,
      outletId: finalOutletId,
      vendorId: finalVendorId,
      type: data.type,
      shipmentDate: combinedDateTime,
      notes: data.notes || '',
      items: data.items.map((item) => ({
        productId: data.type === 'PRODUCT' ? item.productId : undefined,
        materialId: data.type === 'MATERIAL' ? item.materialId : undefined,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes || ''
      }))
    };
    await createMutation.mutateAsync(payload);
    setOpen(false);
  };

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" icon={Plus}>
          Buat Pengiriman
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 rounded-sm border-none shadow-3xl bg-white flex flex-col overflow-hidden">
        <DialogHeader className="p-8 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-sm">
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
            Form Pengiriman Central Kitchen
          </DialogTitle>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2 pl-14">
            Dokumen pengiriman baru ke outlet
          </p>
        </DialogHeader>

        <DistributionForm
          destinationOptions={destinationOptions}
          onSubmit={onSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
