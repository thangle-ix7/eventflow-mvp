import apiClient from './apiClient';

const taskApi = {
  getEventTasks: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/tasks`);
    return response.data;
  },

  getTask: async (taskId) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  },

  createTask: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/events/${eventId}/tasks`, payload);
    return response.data;
  },

  updateTask: async ({ taskId, payload }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.put(`/tasks/${taskId}`, payload);
    return response.data;
  },

  deleteTask: async (taskId) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    await apiClient.delete(`/tasks/${taskId}`);
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
