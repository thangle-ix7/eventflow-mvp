import apiClient from './apiClient';

const eventApi = {
  getMyEvents: async () => {
    const response = await apiClient.get('/events');
    return response.data?.content || response.data;
  },

  getEvent: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },

  createEvent: async (payload) => {
    const response = await apiClient.post('/events', payload);
    return response.data;
  },

  updateEvent: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.put(`/events/${eventId}`, payload);
    return response.data;
  },

  deleteEvent: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    await apiClient.delete(`/events/${eventId}`);
  },
};

export default eventApi;
