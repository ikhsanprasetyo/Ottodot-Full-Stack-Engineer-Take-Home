'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit, Truck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { updateRTUDistribution } from '@/lib/hooks/queries/rtu-distribution';
import dayjs from 'dayjs';
import { DistributionForm, DistributionFormValues } from './distribution-form';

interface EditDistributionDialogProps {
  distribution: RTUDistribution;
}

export function EditDistributionDialog({
  distribution
}: EditDistributionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: outletsResp } = useGetOutlets(0, 1000);
  const outlets = outletsResp?.data || [];

  const destinationOptions = outlets.map((o: any) => ({
    label: o.label,
    value: o._id || o.id
  }));

  const initialValues: Partial<DistributionFormValues> = {
    sourceOutletId: distribution.sourceOutletId || '',
    outletId: distribution.outletId || '',
    vendorId: distribution.vendorId || '',
    destinationType: distribution.vendorId ? 'VENDOR' : 'OUTLET',
    type: distribution.type || 'PRODUCT',
    shipmentDate: dayjs(distribution.shipmentDate).format('YYYY-MM-DD'),
    shipmentTime: dayjs(distribution.shipmentDate).format('HH:mm'),
    notes: distribution.notes || '',
    items: distribution.items.map((item) => ({
      productId: item.productId || '',
      materialId: item.materialId || '',
      qty: item.qty || 0,
      unit: item.unit || '',
      notes: item.notes || ''
    }))
  };

  const onSubmit = async (data: DistributionFormValues) => {
    setIsSubmitting(true);
    try {
      const timeStr = data.shipmentTime || '07:00';
      const combinedDateTime = dayjs(
        `${data.shipmentDate}T${timeStr}:00`
      ).toISOString();

      let finalOutletId: string | null = null;
      let finalVendorId: string | null = null;

      if (data.destinationType === 'VENDOR') {
        finalVendorId = data.vendorId || null;
      } else {
        finalOutletId = data.outletId || null;
      }

      const payload = {
        sourceOutletId: data.sourceOutletId,
        outletId: finalOutletId,
        vendorId: finalVendorId,
        type: data.type,
        shipmentDate: combinedDateTime,
        notes: data.notes || '',
        items: data.items.map((i) => ({
          productId: data.type === 'PRODUCT' ? i.productId : undefined,
          materialId: data.type === 'MATERIAL' ? i.materialId : undefined,
          qty: Number(i.qty),
          unit: i.unit,
          notes: i.notes || ''
        }))
      };

      await updateRTUDistribution(
        (distribution as any)._id || (distribution as any).id,
        payload
      );
      toast.success('Distribusi berhasil diupdate');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['rtu-distributions'] });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Gagal update distribusi'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-amber-600 border-amber-200 hover:bg-amber-50"
          title="Edit"
          icon={Edit}
        />
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 rounded-sm border-none shadow-3xl bg-white flex flex-col overflow-hidden">
        <DialogHeader className="p-8 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-sm">
              <Truck className="w-8 h-8 text-amber-600" />
            </div>
            Edit Pengiriman (Distribusi)
          </DialogTitle>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2 pl-14">
            Edit dokumen pengiriman
          </p>
        </DialogHeader>

        <DistributionForm
          initialValues={initialValues}
          destinationOptions={destinationOptions}
          onSubmit={onSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
