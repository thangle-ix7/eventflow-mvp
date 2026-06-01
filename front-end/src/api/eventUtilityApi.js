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

  createCalendarItem: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/events/${eventId}/calendar`, payload);
    return response.data;
  },

  updateCalendarItem: async ({ eventId, calendarItemId, payload }) => {
    if (!eventId || !calendarItemId) {
      throw new Error('eventId/calendarItemId không hợp lệ');
    }

    const response = await apiClient.put(`/events/${eventId}/calendar/${calendarItemId}`, payload);
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
