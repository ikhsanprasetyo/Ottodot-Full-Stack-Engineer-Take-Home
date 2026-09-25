import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUDistribution } from '@/lib/type/rtu_distribution';
import { toast } from 'sonner';

export const useGetRTUDistributions = (outletId?: string) => {
  return useQuery<RTUDistribution[]>({
    queryKey: ['rtu-distributions', { outletId }],
    queryFn: async () => {
      const response = await api.get('/rtu/distribution/all', {
        params: { outletId }
      });
      return response.data.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUDistribution = (id: string | undefined) => {
  return useQuery<RTUDistribution>({
    queryKey: ['rtu-distribution', id],
    queryFn: async () => {
      const response = await api.get(`/rtu/distribution/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useCreateRTUDistribution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<RTUDistribution>) => {
      const response = await api.post('/rtu/distribution', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rtu-distributions'] });
      toast.success('Distribution document created');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to create distribution'
      );
    }
  });
};

export const updateRTUDistribution = async (id: string, data: any) => {
  const response = await api.put(`/rtu/distribution/${id}`, data);
  return response.data.data;
};

export const cancelRTUDistribution = async (id: string) => {
  const response = await api.post(`/rtu/distribution/cancel/${id}`);
  return response.data.data;
};

export const useShipRTUDistribution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/rtu/distribution/ship/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-distribution', id] });
      queryClient.invalidateQueries({ queryKey: ['rtu-products'] });
      toast.success('Goods shipped and stock deducted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to ship goods');
    }
  });
};

export const useReceiveRTUDistribution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/rtu/distribution/receive/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rtu-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['rtu-distribution', id] });
      toast.success('Goods received by outlet');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm receipt');
    }
  });
};
