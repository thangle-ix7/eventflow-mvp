import apiClient from './apiClient';

const dashboardApi = {
  getSummary: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/dashboard-summary`
    );

    return response.data;
  },
};

export default dashboardApi;