import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import {
  RTUMaterial,
  RTUMaterialPriceHistory,
  RTUStockLedger
} from '@/lib/type/rtu_material';

export const useGetRTUMaterials = (
  keyword: string = '',
  isActive?: boolean,
  vendorId?: string,
  outletId?: string,
  category?: string,
  showDeleted?: boolean
) => {
  return useQuery<{ data: RTUMaterial[] } | any>({
    queryKey: [
      'rtu-materials',
      keyword,
      isActive,
      vendorId,
      outletId,
      category,
      showDeleted
    ],
    queryFn: async () => {
      const params: any = {};
      if (keyword) params.search = keyword;
      if (isActive !== undefined) params.is_active = isActive;
      if (vendorId) params.vendor_id = vendorId;
      if (outletId) params.outlet_id = outletId;
      if (category) params.category = category;
      if (showDeleted !== undefined) params.show_deleted = showDeleted;

      const res = await api.get(`/rtu/material/all`, { params });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
    retry: 1
  });
};

export const useGetRTUMaterial = (id: string | undefined) => {
  return useQuery<{ data: RTUMaterial } | any>({
    queryKey: ['rtu-material', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/material/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useGetRTUMaterialPriceHistory = (
  id: string | undefined,
  outletId?: string
) => {
  return useQuery<{ data: RTUMaterialPriceHistory[] } | any>({
    queryKey: ['rtu-material-price', id, outletId],
    queryFn: async () => {
      const res = await api.get(`/rtu/material/${id}/price-history`, {
        params: { outlet_id: outletId }
      });
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useGetRTUMaterialLedger = (id: string | undefined) => {
  return useQuery<{ data: RTUStockLedger[] } | any>({
    queryKey: ['rtu-material-ledger', id],
    queryFn: async () => {
      const res = await api.get(`/rtu/material/${id}/stock-ledger`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    retry: 1
  });
};

export const useGetRTUMaterialLots = (
  id: string | undefined,
  outletId: string | undefined
) => {
  return useQuery<{ data: any[] } | any>({
    queryKey: ['rtu-material-lots', id, outletId],
    queryFn: async () => {
      const res = await api.get(`/rtu/material/${id}/lots`, {
        params: { outlet_id: outletId }
      });
      return res.data;
    },
    enabled: !!id && !!outletId,
    staleTime: 0,
    retry: 1
  });
};
