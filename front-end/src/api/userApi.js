import apiClient from './apiClient';

const userApi = {
  getProfile: async (userId, options = {}) => {
    if (!userId) {
      throw new Error('userId không hợp lệ');
    }

    // Lấy từ cache localStorage trước (đã có từ login response)
    if (options.preferCache !== false) {
      try {
        const saved = localStorage.getItem('user');
        if (saved) {
          const user = JSON.parse(saved);
          if (user.userId === userId) {
            return user;
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // Fallback: gọi API nếu cần
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  createTelegramLinkToken: async (userId) => {
    if (!userId) {
      throw new Error('userId không hợp lệ');
    }

    const response = await apiClient.post(`/users/${userId}/telegram-link-token`);
    return response.data;
  },

  getPendingNotificationCount: async (userId) => {
    if (!userId) {
      throw new Error('userId không hợp lệ');
    }

    const response = await apiClient.get(`/users/${userId}/notifications/pending-count`);
    return response.data;
  },

  uploadAvatar: async ({ userId, file }) => {
    if (!userId) {
      throw new Error('userId không hợp lệ');
    }

    if (!file) {
      throw new Error('Vui lòng chọn ảnh đại diện');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAvatarBlob: async (userId) => {
    if (!userId) {
      throw new Error('userId không hợp lệ');
    }

    const response = await apiClient.get(`/users/${userId}/avatar`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default userApi;
