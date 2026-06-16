import apiClient from './apiClient';

const leaderSnapshotApi = {
  getLeaderSnapshot: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/leader-snapshot`);
    return response.data;
  },
  getDepartmentLeaderSnapshot: async ({ eventId, departmentId }) => {
    if (!eventId || !departmentId) {
      throw new Error('eventId/departmentId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/departments/${departmentId}/leader-snapshot`);
    return response.data;
  },
  getPriorityTasks: async ({ eventId, priority, milestoneId, page = 0, size = 8 }) => {
    if (!eventId || !priority) {
      throw new Error('eventId/priority không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/leader-snapshot/priority-tasks`, {
      params: {
        priority,
        milestoneId: milestoneId || undefined,
        page,
        size,
      },
    });
    return response.data;
  },
};

export default leaderSnapshotApi;
