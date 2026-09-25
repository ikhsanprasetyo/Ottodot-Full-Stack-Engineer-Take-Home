import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import api from '@/lib/api/api';
import { toast } from 'sonner';
import { CreateInvoiceReconcileInput } from '@/lib/type/rtu_invoice_reconcile';

const QUERY_KEY = 'rtu-invoice-reconciles';

export const useGetRTUInvoiceReconciles = (params?: {
  purchaseId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/rtu/invoice/all', { params });
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUInvoiceReconcile = (id: string | undefined) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/rtu/invoice/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useCreateRTUInvoiceReconcile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoiceReconcileInput) => {
      const { data } = await api.post('/rtu/invoice', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rtu-grns'] });
      toast.success('Invoice Reconcile berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Gagal membuat Invoice Reconcile'
      );
    }
  });
};

export const useUpdateRTUInvoiceReconcile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<CreateInvoiceReconcileInput>;
    }) => {
      const { data } = await api.put(`/rtu/invoice/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Invoice Reconcile berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Gagal memperbarui Invoice Reconcile'
      );
    }
  });
};

export const useConfirmRTUInvoiceReconcile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/rtu/invoice/confirm/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['rtu-purchases'] });
      toast.success('Invoice Reconcile berhasil dikonfirmasi');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Gagal mengkonfirmasi Invoice Reconcile'
      );
    }
  });
};

export const useCancelRTUInvoiceReconcile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/rtu/invoice/cancel/${id}`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Invoice Reconcile berhasil dibatalkan');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Gagal membatalkan Invoice Reconcile'
      );
    }
  });
};
