import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { UpdateLiveLoginInput } from '@/lib/type/live-login';
import { setSessionStorage } from '@/lib/sessionStorage';

export const useDeleteUser = () => {
  return useMutation({
    mutationKey: ['deleteUser'],
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/user/${userId}`);
      return res.data;
    }
  });
};

export const useRestoreUser = () => {
  return useMutation({
    mutationKey: ['restoreUser'],
    mutationFn: async (userId: string) => {
      const res = await api.post(`/user/restore/${userId}`);
      return res.data;
    }
  });
};

export const useHardDeleteUser = () => {
  return useMutation({
    mutationKey: ['hardDeleteUser'],
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/user/${userId}/permanent`);
      return res.data;
    }
  });
};

export const useEditUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['editUser'],
    mutationFn: async ({ id, data }: { id: string | undefined; data: any }) => {
      const res = await api.put<any>(`/user/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      // If we edited OURSELF, we should invalidate/sync
      // (Though usually useEditUser is for Admin editing others)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // If the edited ID is the same as current user, update storage
      // We can't easily check IDs here without more context, but invalidation handles UI.
    }
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['updateUserProfile'],
    mutationFn: async (data: any) => {
      const res = await api.put('/user/profile', data);
      return res.data;
    },
    onSuccess: (res) => {
      // 1. Invalidate query to trigger real-time updates across UI
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      // 2. Sync sessionStorage for fresh page loads / components not using hooks
      if (res?.data) {
        setSessionStorage('user', res.data);
      }
    }
  });
};

function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useUpdateLiveLogin = (isAuth: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuth || typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    let isMounted = true;
    let lastProcessed = { lat: 0, lng: 0, time: 0 };

    const sendLocationUpdate = async (position: GeolocationPosition) => {
      if (!isMounted) return;

      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed
      } = position.coords;
      const now = Date.now();
      const dist = getDistanceFromLatLonInMeters(
        lastProcessed.lat,
        lastProcessed.lng,
        latitude,
        longitude
      );

      // Throttling: Hanya update jika user bergerak > 15 meter ATAU update terakhir sudah > 5 menit lalu
      if (
        lastProcessed.time > 0 &&
        dist < 15 &&
        now - lastProcessed.time < 5 * 60 * 1000
      ) {
        return;
      }

      lastProcessed = { lat: latitude, lng: longitude, time: now };

      let address: any = null;
      let dataGoogle: any = null;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        dataGoogle = data;
        address = data.address;
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      }

      const payload: UpdateLiveLoginInput = {
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed,
        timestamp: position.timestamp,
        address,
        type: dataGoogle?.type,
        addresstype: dataGoogle?.addresstype,
        display_name: dataGoogle?.display_name,
        isGps: true,
        source: 'gps'
      };

      await api
        .post('/user/update-live-login', payload, { withCredentials: true })
        .catch(console.error);

      if (isMounted) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    };

    // 1. Instant Initial Location (Instant < 1 detik via Cell/WiFi/Cache)
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocationUpdate(pos),
      async () => {
        // Fallback ke server-side GeoIP jika akses ditolak/gagal
        await api
          .post(
            '/user/update-live-login',
            { isGps: false, source: 'geoip' },
            { withCredentials: true }
          )
          .catch(console.error);
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 }
    );

    // 2. Realtime Stream GPS Watcher (Mengirim update reaktif saat koordinat berubah)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => sendLocationUpdate(pos),
      (err) => console.warn('Realtime GPS Watcher warning:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      isMounted = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isAuth, queryClient]);

  return { refetch: () => {}, isFetching: false };
};
