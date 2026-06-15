import apiClient from './apiClient';

const aiSuggestionApi = {
  suggestDepartments: async ({ eventId, instruction, count = 5 }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/ai-suggestions/events/${eventId}/departments`, {
      instruction: instruction || undefined,
      count,
    });
    return response.data;
  },

  suggestTasks: async ({ eventId, instruction, count = 5 }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/ai-suggestions/events/${eventId}/tasks`, {
      instruction: instruction || undefined,
      count,
    });
    return response.data;
  },

  suggestCalendarItems: async ({ eventId, instruction, count = 3 }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/ai-suggestions/events/${eventId}/calendar`, {
      instruction: instruction || undefined,
      count,
    });
    return response.data;
  },

  suggestPlanning: async ({ eventId, instruction }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/ai-suggestions/events/${eventId}/planning`, {
      instruction: instruction || undefined,
    });
    return response.data;
  },

  suggestSubtasks: async ({ taskId, instruction, count = 5 }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.post(`/ai-suggestions/tasks/${taskId}/subtasks`, {
      instruction: instruction || undefined,
      count,
    });
    return response.data;
  },
};

export default aiSuggestionApi;
