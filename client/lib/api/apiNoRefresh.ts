import api, { skipRefreshConfig } from './api';
import { AxiosRequestConfig } from 'axios';

export function apiNoRefreshGet(url: string, config?: AxiosRequestConfig) {
  return api.get(url, skipRefreshConfig(config));
}

export function apiNoRefreshPost(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) {
  return api.post(url, data, skipRefreshConfig(config));
}
