import apiClient from './apiClient';

const eventApi = {
  getMyEventsPage: async ({
    page = 0,
    size = 10,
    sort = 'eventDate',
    direction = 'asc',
    status,
    search,
  } = {}) => {
    const response = await apiClient.get('/events', {
      params: {
        page,
        size,
        sort,
        direction,
        status: status || undefined,
        search: search || undefined,
      },
    });
    return response.data;
  },

  getMyEvents: async () => {
    const pageResponse = await eventApi.getMyEventsPage({ size: 100 });
    return pageResponse?.content || pageResponse;
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
