import apiClient from './apiClient';

const eventMemberApi = {
  getMembers: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/members`);
    return response.data;
  },

  getMember: async ({ eventId, userId }) => {
    if (!eventId || !userId) {
      throw new Error('eventId/userId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/members/${userId}`);
    return response.data;
  },

  addMember: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/events/${eventId}/members`, payload);
    return response.data;
  },

  confirmInvitation: async (token) => {
    if (!token) {
      throw new Error('Token lời mời không hợp lệ');
    }

    const response = await apiClient.post('/event-invitations/confirm', { token });
    return response.data;
  },

  updateRole: async ({ eventId, userId, role }) => {
    if (!eventId || !userId) {
      throw new Error('eventId/userId không hợp lệ');
    }

    const response = await apiClient.patch(
      `/events/${eventId}/members/${userId}/role`,
      { role }
    );
    return response.data;
  },

  removeMember: async ({ eventId, userId }) => {
    if (!eventId || !userId) {
      throw new Error('eventId/userId không hợp lệ');
    }

    await apiClient.delete(`/events/${eventId}/members/${userId}`);
  },
};

export default eventMemberApi;
