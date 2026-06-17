import apiClient from './apiClient';

const milestoneApi = {
  getEventMilestones: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/milestones`);
    return response.data;
  },

  createMilestone: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/events/${eventId}/milestones`, payload);
    return response.data;
  },

  updateMilestone: async ({ eventId, milestoneId, payload }) => {
    if (!eventId || !milestoneId) {
      throw new Error('eventId/milestoneId không hợp lệ');
    }

    const response = await apiClient.put(`/events/${eventId}/milestones/${milestoneId}`, payload);
    return response.data;
  },
};

export default milestoneApi;
