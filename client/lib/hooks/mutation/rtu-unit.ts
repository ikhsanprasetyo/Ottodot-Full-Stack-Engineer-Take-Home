import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api/api';

export const useRestoreRTUUnit = () => {
  return useMutation({
    mutationKey: ['restoreRTUUnit'],
    mutationFn: async (id: string) => {
      const res = await api.post(`/rtu/unit/restore/${id}`);
      return res.data;
    }
  });
};

export const useHardDeleteRTUUnit = () => {
  return useMutation({
    mutationKey: ['hardDeleteRTUUnit'],
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rtu/unit/${id}/permanent`);
      return res.data;
    }
  });
};
