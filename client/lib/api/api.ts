import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getApi } from '../utils';
import { getUserFromStorage } from '../hooks/getUserFromStorage';
import { isAuthenticated } from './isAuthenticated';
import { handleTokenRefresh } from './handleTokenRefresh';
import { getDateStr } from '../date';
import { removeSessionStorage } from '../sessionStorage';

// --- Axios instance ---
export const api = axios.create({
  baseURL: getApi(),
  withCredentials: true // penting untuk httpOnly refresh token
});

// --- Request interceptor ---
api.interceptors.request.use(async (config: any) => {
  // Cegah browser caching hanya untuk request GET agar refetch realtime selalu akurat
  if (config.method?.toLowerCase() === 'get') {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }

  if (config.headers?.['x-skip-refresh']) return config; // skip interceptor

  let token = getUserFromStorage()?.accessToken;

  // Jika token expired, tunggu refresh dulu
  if (!isAuthenticated()) {
    const accessTokenExpiresAt = getUserFromStorage()?.accessTokenExpiresAt;
    console.log(
      `[Axios] ${getDateStr(accessTokenExpiresAt, 'YYYY-MM-DD HH:mm:ss')} Access token expired, mencoba refresh token...`
    );
    try {
      const newUser = await handleTokenRefresh();
      token = newUser?.accessToken;
    } catch (err) {
      console.warn(
        '[Axios] Refresh token gagal, logout mungkin dipicu backend'
      );
      return Promise.reject(err);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --- Response interceptor ---
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Automatically format the error message to prepend the HTTP status code
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      if (data && typeof data === 'object') {
        if (data.message && typeof data.message === 'string') {
          if (!data.message.startsWith('[Error ')) {
            data.message = `[Error ${status}] ${data.message}`;
          }
        } else {
          data.message = `[Error ${status}] Terjadi kesalahan server`;
        }
      } else {
        error.response.data = {
          success: false,
          message: `[Error ${status}] Terjadi kesalahan server`
        };
      }
    }

    if (
      error.response?.status === 401 &&
      (error.response?.data as any)?.code === 'ACCESS_TOKEN_EXPIRED' &&
      !originalRequest?._retry &&
      !originalRequest?.headers?.['x-skip-refresh']
    ) {
      originalRequest._retry = true;
      try {
        const newUser = await handleTokenRefresh();
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newUser?.accessToken || ''}`
        };
        return api(originalRequest);
      } catch {
        // Jika refresh token gagal, paksa logout
        removeSessionStorage('user');
        window.location.href = '/';
        return Promise.reject(error);
      }
    } else if (
      error.response?.status === 401 &&
      !originalRequest?.headers?.['x-skip-refresh']
    ) {
      // Jika error 401 dan BUKAN expired token (misal: Token invalidated)
      // Paksa logout untuk menghindari 'Failed to load profile' dan WebSocket spam
      removeSessionStorage('user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

// --- Helper config untuk login/register (skip interceptor refresh) ---
export const skipRefreshConfig = (config: AxiosRequestConfig = {}) => ({
  ...config,
  headers: {
    ...config.headers,
    'x-skip-refresh': 'true'
  }
});

export default api;
