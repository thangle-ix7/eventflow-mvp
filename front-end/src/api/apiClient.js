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

    const status = error.response?.status;
    const fieldErrors = error.response?.data?.fieldErrors;
    const validationMessage = fieldErrors
      ? Object.values(fieldErrors).join('\n')
      : null;

    const message =
      validationMessage ||
      getFriendlyErrorMessage(status, error);
    redirectPageLoadError(error, status, message, isAuthRequest);

    return Promise.reject({
      ...error,
      status,
      userMessage: message,
    });
  }
);

const redirectPageLoadError = (error, status, message, isAuthRequest) => {
  const method = (error.config?.method || 'get').toLowerCase();
  if (method !== 'get' || isAuthRequest || error.config?.skipGlobalErrorRedirect) {
    return;
  }

  const shouldRedirect =
    !status ||
    status === 403 ||
    status === 404 ||
    status >= 500;

  if (!shouldRedirect || window.location.pathname === '/error') {
    return;
  }

  window.dispatchEvent(new CustomEvent('eventflow:api-error', {
    detail: {
      status,
      message,
      requestUrl: error.config?.url,
    },
  }));
};

const getFriendlyErrorMessage = (status, error) => {
  const serverMessage = error.response?.data?.message || error.response?.data?.error;

  if (!status) {
    return 'Không kết nối được tới hệ thống. Vui lòng kiểm tra mạng hoặc thử lại sau.';
  }

  if (status === 400) {
    return serverMessage || 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.';
  }

  if (status === 403) {
    return serverMessage || 'Bạn không có quyền truy cập nội dung này.';
  }

  if (status === 404) {
    return 'Không tìm thấy dữ liệu cần truy cập. Nội dung có thể đã bị xóa hoặc thay đổi.';
  }

  if (status === 409) {
    return serverMessage || 'Dữ liệu đã thay đổi. Vui lòng tải lại trang và thử lại.';
  }

  if (status === 402) {
    return serverMessage || 'Gói hiện tại đã chạm giới hạn. Vui lòng nâng cấp để tiếp tục.';
  }

  if (status === 413) {
    return 'Tệp hoặc dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng và thử lại.';
  }

  if (status === 429) {
    return 'Bạn thao tác hơi nhanh. Vui lòng chờ một chút rồi thử lại.';
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
  }

  return serverMessage || 'Có lỗi xảy ra. Vui lòng thử lại.';
};

export default apiClient;
