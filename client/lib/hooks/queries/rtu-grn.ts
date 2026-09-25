import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUGRN } from '@/lib/type/rtu_grn';

export const useGetRTUGRNs = (status?: string) => {
  return useQuery<{ data: RTUGRN[] } | any>({
    queryKey: ['rtu-grns', status],
    queryFn: async () => {
      const params: any = {};
      if (status) params.status = status;

      const res = await api.get(`/rtu/grn/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUGRN = (id: string | undefined) => {
  return useQuery<{ data: RTUGRN } | any>({
    queryKey: ['rtu-grn', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/grn/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};
