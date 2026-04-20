import axios from 'axios';

const API_URL = `/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // Redirect on 401 (Unauthorized) or 403 (Forbidden)
    if ((status === 401 || status === 403) && 
        !window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/student-login') &&
        !window.location.pathname.includes('/admin-login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
