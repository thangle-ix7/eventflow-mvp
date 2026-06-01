import apiClient from './apiClient';

const eventUtilityApi = {
  getCalendarMonth: async ({ eventId, year, month }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/calendar`, {
      params: { year, month },
    });
    return response.data;
  },

  getDocuments: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/documents`);
    return response.data;
  },

  getReports: async ({ eventId, fromDate, toDate }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/reports`, {
      params: { fromDate, toDate },
    });
    return response.data;
  },

  getDashboardComparison: async ({ eventId, fromDate, toDate }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/comparison`, {
      params: { fromDate, toDate },
    });
    return response.data;
  },
};

export default eventUtilityApi;
