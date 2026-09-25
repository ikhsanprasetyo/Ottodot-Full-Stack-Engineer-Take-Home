import axios from 'axios';
import { getApi } from '../utils';
import { setSessionStorage } from '../sessionStorage';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (user?: any) => void;
  reject: (err: any) => void;
}> = [];

export const isAuthRefreshing = () => isRefreshing;

const processQueue = (error: any, newUser?: any) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(newUser);
  });
  failedQueue = [];
};

/**
 * Handle refresh token
 * Mengembalikan user baru dengan accessTokenExpiresAt terbaru
 */
export const handleTokenRefresh = async () => {
  if (isRefreshing) {
    return new Promise<any>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const res = await axios.post(
      `${getApi()}/user/refresh-token`,
      {},
      { withCredentials: true, headers: { 'x-refresh-request': 'true' } }
    );

    const newUser = res.data?.user;
    if (newUser) setSessionStorage('user', newUser);

    processQueue(null, newUser);
    return newUser;
  } catch (err) {
    processQueue(err);
    throw err;
  } finally {
    isRefreshing = false;
  }
};
