import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api/api';

export const useRestoreRTUVendor = () => {
  return useMutation({
    mutationKey: ['restoreRTUVendor'],
    mutationFn: async (id: string) => {
      const res = await api.post(`/rtu/vendor/restore/${id}`);
      return res.data;
    }
  });
};

export const useHardDeleteRTUVendor = () => {
  return useMutation({
    mutationKey: ['hardDeleteRTUVendor'],
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rtu/vendor/${id}/permanent`);
      return res.data;
    }
  });
};
