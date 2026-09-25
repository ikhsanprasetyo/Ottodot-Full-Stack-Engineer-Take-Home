import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api/api';

export const useRestoreRTUMaterial = () => {
  return useMutation({
    mutationKey: ['restoreRTUMaterial'],
    mutationFn: async (id: string) => {
      const res = await api.post(`/rtu/material/restore/${id}`);
      return res.data;
    }
  });
};

export const useHardDeleteRTUMaterial = () => {
  return useMutation({
    mutationKey: ['hardDeleteRTUMaterial'],
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rtu/material/${id}/permanent`);
      return res.data;
    }
  });
};
