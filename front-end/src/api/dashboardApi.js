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

  getTaskTrend: async (eventId, params = {}) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/task-trend`, { params });
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

  getTasksByStatus: async (eventId, params = {}) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/tasks-by-status`, { params });
    return response.data;
  },

  getComparison: async (eventId, params = {}) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/dashboard/comparison`, { params });
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

  getDepartmentTaskTrend: async ({ eventId, departmentId, fromDate, toDate }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard/task-trend`,
      { params: { fromDate, toDate } }
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

  getDepartmentTasksByStatus: async ({ eventId, departmentId, fromDate, toDate }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/dashboard/tasks-by-status`,
      { params: { fromDate, toDate } }
    );
    return response.data;
  },
};

export default dashboardApi;
