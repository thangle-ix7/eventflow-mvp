import apiClient from './apiClient';

const taskApi = {
  getEventTasks: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/tasks`);
    return response.data;
  },

  getEventTaskPage: async ({
    eventId,
    page = 0,
    size = 10,
    sort = 'deadline',
    direction = 'asc',
    status,
    departmentId,
    assigneeId,
    search,
    fromDate,
    toDate,
  }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/tasks/page`, {
      params: {
        page,
        size,
        sort,
        direction,
        status: status || undefined,
        departmentId: departmentId || undefined,
        assigneeId: assigneeId || undefined,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    });
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

  updateTaskAssignment: async ({ taskId, departmentId, assigneeId }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.patch(`/tasks/${taskId}/assignment`, {
      departmentId: departmentId || null,
      assigneeId: assigneeId || null,
    });

    return response.data;
  },

  getTaskReports: async (taskId) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.get(`/tasks/${taskId}/reports`);
    return response.data;
  },

  createTaskReport: async ({ taskId, progressPercentage, description, image }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const formData = new FormData();
    formData.append('progressPercentage', progressPercentage);
    formData.append('description', description);
    if (image) {
      formData.append('image', image);
    }

    const response = await apiClient.post(`/tasks/${taskId}/reports`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateTaskReport: async ({ reportId, progressPercentage, description, image }) => {
    if (!reportId) {
      throw new Error('reportId không hợp lệ');
    }

    const formData = new FormData();
    formData.append('progressPercentage', progressPercentage);
    formData.append('description', description);
    if (image) {
      formData.append('image', image);
    }

    const response = await apiClient.put(`/task-reports/${reportId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getTaskReportImage: async (reportId) => {
    if (!reportId) {
      throw new Error('reportId không hợp lệ');
    }

    const response = await apiClient.get(`/task-reports/${reportId}/image`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getTaskAttachments: async (taskId) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.get(`/tasks/${taskId}/attachments`);
    return response.data;
  },

  uploadTaskAttachments: async ({ taskId, files }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!files?.length) {
      throw new Error('Cần chọn ít nhất một file');
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));

    const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadTaskAttachment: async (attachmentId) => {
    if (!attachmentId) {
      throw new Error('attachmentId không hợp lệ');
    }

    const response = await apiClient.get(`/task-attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default taskApi;
