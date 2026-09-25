import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUCategory } from '@/lib/type/rtu_category';

export const useGetRTUCategories = (
  keyword: string = '',
  isActive?: boolean,
  showDeleted?: boolean
) => {
  return useQuery<{ data: RTUCategory[] } | any>({
    queryKey: ['rtu-categories', keyword, isActive, showDeleted],
    queryFn: async () => {
      const params: any = {};
      if (keyword) params.search = keyword;
      if (isActive !== undefined) params.is_active = isActive;
      if (showDeleted !== undefined) params.show_deleted = showDeleted;

      const res = await api.get(`/rtu/category/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUCategory = (id: string | undefined) => {
  return useQuery<{ data: RTUCategory } | any>({
    queryKey: ['rtu-category', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/category/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};
