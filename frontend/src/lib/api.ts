import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiBaseURL = rawBase ? `${rawBase}/api` : '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dosewise_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dosewise_token');
      localStorage.removeItem('dosewise_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/** Resolve uploaded asset paths against the API host in production. */
export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return rawBase ? `${rawBase}${normalized}` : normalized;
}

export default api;
