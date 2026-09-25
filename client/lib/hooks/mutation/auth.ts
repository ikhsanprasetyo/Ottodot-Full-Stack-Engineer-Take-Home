import { useMutation } from '@tanstack/react-query';
import { skipRefreshConfig } from '@/lib/api/api';
import { apiNoRefreshPost } from '@/lib/api/apiNoRefresh';

async function getCurrentLocation() {
  if (!navigator.geolocation)
    return { latitude: null, longitude: null, accuracy: null };

  return new Promise<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  }>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
      () => resolve({ latitude: null, longitude: null, accuracy: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export const useLogin = () => {
  return useMutation<any, any, { email: string; password: string }>({
    mutationFn: async (data) => {
      const location = await getCurrentLocation();

      const payload = {
        ...data,
        ...location
      };

      const res = await apiNoRefreshPost(
        '/user/login',
        payload,
        skipRefreshConfig()
      );
      return res.data;
    }
  });
};

export const useRegister = () => {
  return useMutation<
    any,
    any,
    { email: string; password: string; username: string; name: string }
  >({
    mutationFn: async (data) => {
      const payload = {
        name: data.name.trim(),
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password
      };

      const res = await apiNoRefreshPost(
        '/user/register',
        payload,
        skipRefreshConfig()
      );
      return res.data;
    }
  });
};
