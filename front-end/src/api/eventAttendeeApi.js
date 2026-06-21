import apiClient from './apiClient';

const requireEventId = (eventId) => {
  if (!eventId) {
    throw new Error('eventId khong hop le');
  }
};

const eventAttendeeApi = {
  getSessions: async (eventId) => {
    requireEventId(eventId);
    const response = await apiClient.get(`/events/${eventId}/attendees/sessions`);
    return response.data;
  },

  createSession: async ({ eventId, payload }) => {
    requireEventId(eventId);
    const response = await apiClient.post(`/events/${eventId}/attendees/sessions`, payload);
    return response.data;
  },

  getAttendees: async ({ eventId, status, sessionId }) => {
    requireEventId(eventId);
    const response = await apiClient.get(`/events/${eventId}/attendees`, {
      params: {
        status: status || undefined,
        sessionId: sessionId || undefined,
      },
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

  sendAttendeeInvitation: async ({ eventId, attendeeId }) => {
    requireEventId(eventId);
    if (!attendeeId) {
      throw new Error('attendeeId khong hop le');
    }

    const response = await apiClient.post(`/events/${eventId}/attendees/${attendeeId}/send-invitation`);
    return response.data;
  },

  sendSessionInvitations: async ({ eventId, sessionId }) => {
    requireEventId(eventId);
    if (!sessionId) {
      throw new Error('sessionId khong hop le');
    }

    const response = await apiClient.post(`/events/${eventId}/attendees/sessions/${sessionId}/send-invitations`);
    return response.data;
  },

  checkIn: async ({ eventId, payload }) => {
    requireEventId(eventId);
    const response = await apiClient.post(`/events/${eventId}/attendees/check-in`, payload);
    return response.data;
  },

  downloadImportTemplate: async (eventId) => {
    requireEventId(eventId);
    const response = await apiClient.get(`/events/${eventId}/attendees/import-template`, {
      responseType: 'blob',
    });
    return response.data;
  },

  importAttendees: async ({ eventId, sessionId, file }) => {
    requireEventId(eventId);
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/events/${eventId}/attendees/import`, formData, {
      params: { sessionId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default eventAttendeeApi;
