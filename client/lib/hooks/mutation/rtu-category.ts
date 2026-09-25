import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api/api';

export const useRestoreRTUCategory = () => {
  return useMutation({
    mutationKey: ['restoreRTUCategory'],
    mutationFn: async (id: string) => {
      const res = await api.post(`/rtu/category/restore/${id}`);
      return res.data;
    }
  });
};

export const useHardDeleteRTUCategory = () => {
  return useMutation({
    mutationKey: ['hardDeleteRTUCategory'],
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rtu/category/${id}/permanent`);
      return res.data;
    }
  });
};
