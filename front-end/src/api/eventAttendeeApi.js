import apiClient from './apiClient';

const requireEventId = (eventId) => {
  if (!eventId) {
    throw new Error('eventId khong hop le');
  }
};

const eventAttendeeApi = {
  getAttendees: async ({ eventId, status }) => {
    requireEventId(eventId);
    const response = await apiClient.get(`/events/${eventId}/attendees`, {
      params: { status: status || undefined },
    });
    return response.data;
  },

  createAttendee: async ({ eventId, payload }) => {
    requireEventId(eventId);
    const response = await apiClient.post(`/events/${eventId}/attendees`, payload);
    return response.data;
  },

  updateAttendee: async ({ eventId, attendeeId, payload }) => {
    requireEventId(eventId);
    if (!attendeeId) {
      throw new Error('attendeeId khong hop le');
    }

    const response = await apiClient.put(`/events/${eventId}/attendees/${attendeeId}`, payload);
    return response.data;
  },

  deleteAttendee: async ({ eventId, attendeeId }) => {
    requireEventId(eventId);
    if (!attendeeId) {
      throw new Error('attendeeId khong hop le');
    }

    await apiClient.delete(`/events/${eventId}/attendees/${attendeeId}`);
  },

  confirmAttendee: async ({ eventId, attendeeId }) => {
    requireEventId(eventId);
    if (!attendeeId) {
      throw new Error('attendeeId khong hop le');
    }

    const response = await apiClient.patch(`/events/${eventId}/attendees/${attendeeId}/confirm`);
    return response.data;
  },

  checkIn: async ({ eventId, payload }) => {
    requireEventId(eventId);
    const response = await apiClient.post(`/events/${eventId}/attendees/check-in`, payload);
    return response.data;
  },
};

export default eventAttendeeApi;
