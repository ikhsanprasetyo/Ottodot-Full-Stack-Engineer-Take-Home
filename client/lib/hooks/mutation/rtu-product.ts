import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api/api';

export const useRestoreRTUProduct = () => {
  return useMutation({
    mutationKey: ['restoreRTUProduct'],
    mutationFn: async (id: string) => {
      const res = await api.post(`/rtu/product/restore/${id}`);
      return res.data;
    }
  });
};

export const useHardDeleteRTUProduct = () => {
  return useMutation({
    mutationKey: ['hardDeleteRTUProduct'],
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rtu/product/${id}/permanent`);
      return res.data;
    }
  });
};
