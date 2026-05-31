import apiClient from './apiClient';

const authApi = {
  login: async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data; // { token, userId, name, email }
  },

  signup: async ({ name, email, password }) => {
    const response = await apiClient.post('/auth/signup', { name, email, password });
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async ({ token, newPassword }) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
};

export default authApi;
