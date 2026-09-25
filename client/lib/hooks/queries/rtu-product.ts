import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { RTUProduct } from '@/lib/type/rtu_product';

export const useGetRTUProducts = (
  keyword: string = '',
  isActive?: boolean,
  outletId?: string,
  category?: string,
  showDeleted?: boolean
) => {
  return useQuery<{ data: RTUProduct[] } | any>({
    queryKey: [
      'rtu-products',
      keyword,
      isActive,
      outletId,
      category,
      showDeleted
    ],
    queryFn: async () => {
      const params: any = {};
      if (keyword) params.search = keyword;
      if (isActive !== undefined) params.is_active = isActive;
      if (outletId) params.outlet_id = outletId;
      if (category) params.category = category;
      if (showDeleted !== undefined) params.show_deleted = showDeleted;

      const res = await api.get(`/rtu/product/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUProduct = (id: string | undefined) => {
  return useQuery<{ data: RTUProduct } | any>({
    queryKey: ['rtu-product', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/product/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useGetRTUProductLots = (
  id: string | undefined,
  outletId: string | undefined
) => {
  return useQuery<{ data: any[] } | any>({
    queryKey: ['rtu-product-lots', id, outletId],
    queryFn: async () => {
      const res = await api.get(`/rtu/product/${id}/lots`, {
        params: { outlet_id: outletId }
      });
      return res.data;
    },
    enabled: !!id && !!outletId,
    staleTime: 0,
    retry: 1
  });
};
