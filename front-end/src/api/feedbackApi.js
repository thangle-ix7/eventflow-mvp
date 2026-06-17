import apiClient from './apiClient';

const feedbackApi = {
  submitFeedback: async (payload) => {
    const response = await apiClient.post('/feedback', payload);
    return response.data;
  },
  getAdminFeedback: async ({ status, eventId, page = 0, size = 10 } = {}) => {
    const params = { page, size };
    if (status) params.status = status;
    if (eventId) params.eventId = eventId;

    const response = await apiClient.get('/admin/feedback', { params });
    return response.data;
  },
  respondToFeedback: async (feedbackId, payload) => {
    const response = await apiClient.put(`/admin/feedback/${feedbackId}/response`, payload);
    return response.data;
  },
};

export default feedbackApi;
