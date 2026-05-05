import axios from 'axios';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const webApi = axios.create({
  baseURL
});

webApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

webApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isAlreadyOnLogin = window.location.pathname === '/login';

      if (!isLoginRequest && !isAlreadyOnLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const buildUrl = (path) => {
  if (!path) return baseURL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const nativeRequest = async (method, path, data, config) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(config?.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await CapacitorHttp.request({
      method: method.toUpperCase(),
      url: buildUrl(path),
      headers,
      params: config?.params,
      data
    });

    if (res.status === 401) {
      const isAlreadyOnLogin = window.location.pathname === '/login';
      if (!isAlreadyOnLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    if (res.status < 200 || res.status >= 300) {
      const error = new Error(`Request failed with status code ${res.status}`);
      error.response = {
        status: res.status,
        data: res.data,
        headers: res.headers
      };
      throw error;
    }

    return {
      data: res.data,
      status: res.status,
      headers: res.headers
    };
  } catch (e) {
    if (e?.response) throw e;
    const error = new Error(e?.message || 'Network Error');
    error.request = {};
    throw error;
  }
};

const api = {
  get: (path, config) => (isNative() ? nativeRequest('get', path, undefined, config) : webApi.get(path, config)),
  delete: (path, config) => (isNative() ? nativeRequest('delete', path, undefined, config) : webApi.delete(path, config)),
  post: (path, data, config) => (isNative() ? nativeRequest('post', path, data, config) : webApi.post(path, data, config)),
  put: (path, data, config) => (isNative() ? nativeRequest('put', path, data, config) : webApi.put(path, data, config)),
  patch: (path, data, config) => (isNative() ? nativeRequest('patch', path, data, config) : webApi.patch(path, data, config))
};

export { buildUrl };
export default api;