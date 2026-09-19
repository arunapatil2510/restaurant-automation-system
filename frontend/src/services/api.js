import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach admin key from sessionStorage if present
api.interceptors.request.use((config) => {
  const adminKey = sessionStorage.getItem('resto_admin_key');
  if (adminKey) {
    config.headers['x-admin-key'] = adminKey;
  }
  return config;
});

export default api;
