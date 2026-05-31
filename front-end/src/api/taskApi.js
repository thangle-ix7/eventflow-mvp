import apiClient from './apiClient';

const taskApi = {
  getEventTasks: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/tasks`);
    return response.data;
  },

  updateTaskStatus: async ({ taskId, status }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!status) {
      throw new Error('status không hợp lệ');
    }

    const response = await apiClient.patch(`/tasks/${taskId}/status`, {
      status,
    });

    return response.data;
  },
};

export default taskApi;