import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn JWT token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nếu 401 thì clear token và reload về login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/');

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('sessionExpired', 'true');
      window.location.assign('/login');
    }

    const fieldErrors = error.response?.data?.fieldErrors;
    const validationMessage = fieldErrors
      ? Object.values(fieldErrors).join('\n')
      : null;

    const message =
      validationMessage ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Có lỗi xảy ra khi gọi API';

    return Promise.reject({
      ...error,
      userMessage: message,
    });
  }
);

export default apiClient;
