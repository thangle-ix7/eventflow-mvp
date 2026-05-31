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

  getTaskTrend: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/task-trend`);
    return response.data;
  },

  getTasksByDepartment: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/tasks-by-department`);
    return response.data;
  },

  getTasksByAssignee: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/tasks-by-assignee`);
    return response.data;
  },

  getTasksByStatus: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/tasks-by-status`);
    return response.data;
  },

  getDepartmentSummary: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard-summary`
    );
    return response.data;
  },

  getDepartmentTaskTrend: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard/task-trend`
    );
    return response.data;
  },

  getDepartmentTasksByAssignee: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard/tasks-by-assignee`
    );
    return response.data;
  },

  getDepartmentTasksByStatus: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard/tasks-by-status`
    );
    return response.data;
  },
};

export default dashboardApi;
