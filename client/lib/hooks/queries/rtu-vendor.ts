import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUVendor } from '@/lib/type/rtu_vendor';

export const useGetRTUVendors = (
  keyword: string = '',
  isActive?: boolean,
  category?: string,
  showDeleted?: boolean
) => {
  return useQuery<{ data: RTUVendor[] } | any>({
    queryKey: ['rtu-vendors', keyword, isActive, category, showDeleted],
    queryFn: async () => {
      const params: any = {};
      if (keyword) params.search = keyword;
      if (isActive !== undefined) params.is_active = isActive;
      if (category) params.category = category;
      if (showDeleted !== undefined) params.show_deleted = showDeleted;

      const res = await api.get(`/rtu/vendor/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUVendor = (id: string | undefined) => {
  return useQuery<{ data: RTUVendor } | any>({
    queryKey: ['rtu-vendor', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/vendor/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};
