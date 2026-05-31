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
};

export default authApi;