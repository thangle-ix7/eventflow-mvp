import apiClient from './apiClient';

const departmentApi = {
  getEventDepartments: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/departments`);
    return response.data?.content || response.data;
  },

  getDepartment: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}`
    );
    return response.data;
  },

  getDepartmentMembers: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/members`
    );
    return response.data;
  },

  createDepartment: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(
      `/events/${eventId}/departments`,
      payload
    );
    return response.data;
  },

  updateDepartment: async ({ eventId, departmentId, payload }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.put(
      `/events/${eventId}/departments/${departmentId}`,
      payload
    );
    return response.data;
  },

  assignMember: async ({ eventId, departmentId, userId }) => {
    if (!eventId || !departmentId || !userId) {
      throw new Error('eventId/departmentId/userId không hợp lệ');
    }

    const response = await apiClient.post(
      `/events/${eventId}/departments/${departmentId}/members`,
      { userId }
    );
    return response.data;
  },

  removeMember: async ({ eventId, departmentId, userId }) => {
    if (!eventId || !departmentId || !userId) {
      throw new Error('eventId/departmentId/userId không hợp lệ');
    }

    await apiClient.delete(
      `/events/${eventId}/departments/${departmentId}/members/${userId}`
    );
  },

  deleteDepartment: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    await apiClient.delete(`/events/${eventId}/departments/${departmentId}`);
  },
};

export default departmentApi;
