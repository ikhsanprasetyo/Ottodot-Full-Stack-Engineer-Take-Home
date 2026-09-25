import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';

export const useGetRTUProductionBatches = (
  status?: string,
  outletId?: string
) => {
  return useQuery<{ data: RTUProductionBatch[] } | any>({
    queryKey: ['rtu-production-batches', status, outletId],
    queryFn: async () => {
      const params: any = {};
      if (status) params.status = status;
      if (outletId) params.outlet_id = outletId;

      const res = await api.get(`/rtu/batch/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUProductionBatch = (
  id: string | undefined,
  enabled = true
) => {
  return useQuery<{ data: RTUProductionBatch } | any>({
    queryKey: ['rtu-production-batch', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/batch/${id}`);
      return res.data;
    },
    enabled: enabled && !!id,
    staleTime: 0,
    retry: 1
  });
};

export interface HRISPosition {
  _id: { $oid: string } | string;
  name: string;
  label: string;
}

export const useGetHRISPositions = () => {
  return useQuery<HRISPosition[]>({
    queryKey: ['hris-positions'],
    queryFn: async () => {
      const res = await api.get('/rtu/batch/hris-positions');
      return res.data?.data || [];
    },
    staleTime: 0,
    retry: 1
  });
};

export const useCancelRTUProductionBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/rtu/batch/cancel/${id}`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-materials'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-stock-ledgers'] });
    }
  });
};
