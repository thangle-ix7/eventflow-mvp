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
    priority,
    departmentId,
    assigneeId,
    search,
    fromDate,
    toDate,
    deadlineStatus,
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
        priority: priority || undefined,
        departmentId: departmentId || undefined,
        assigneeId: assigneeId || undefined,
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        deadlineStatus: deadlineStatus || undefined,
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

  getSubtasks: async ({ taskId, page = 0, size = 8 }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.get(`/tasks/${taskId}/subtasks`, {
      params: {
        page,
        size,
      },
    });
    return response.data;
  },

  createTask: async ({ eventId, payload }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.post(`/events/${eventId}/tasks`, payload);
    return response.data;
  },

  createSubtask: async ({ taskId, payload }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.post(`/tasks/${taskId}/subtasks`, payload);
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

  updateTaskPriority: async ({ taskId, priority }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!priority) {
      throw new Error('priority không hợp lệ');
    }

    const response = await apiClient.patch(`/tasks/${taskId}/priority`, {
      priority,
    });
    return response.data;
  },

  updateTaskWork: async ({ taskId, status, progressPercentage }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!status) {
      throw new Error('status không hợp lệ');
    }

    const response = await apiClient.patch(`/tasks/${taskId}/work-update`, {
      status,
      progressPercentage,
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

  getTaskReviews: async (taskId) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    const response = await apiClient.get(`/tasks/${taskId}/reviews`);
    return response.data;
  },

  reviewTask: async ({ taskId, feedback, status }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!feedback?.trim()) {
      throw new Error('Feedback không được để trống');
    }

    if (!status) {
      throw new Error('Status mới không hợp lệ');
    }

    const response = await apiClient.post(`/tasks/${taskId}/review`, {
      feedback,
      status,
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

  uploadTaskAttachments: async ({ taskId, files, linkUrl, linkTitle, visibility }) => {
    if (!taskId) {
      throw new Error('taskId không hợp lệ');
    }

    if (!files?.length && !linkUrl?.trim()) {
      throw new Error('Cần chọn file hoặc nhập đường dẫn');
    }

    const formData = new FormData();
    Array.from(files || []).forEach((file) => formData.append('files', file));
    if (linkUrl?.trim()) {
      formData.append('linkUrl', linkUrl.trim());
    }
    if (linkTitle?.trim()) {
      formData.append('linkTitle', linkTitle.trim());
    }
    if (visibility) {
      formData.append('visibility', visibility);
    }

    const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateTaskAttachment: async ({ attachmentId, originalName, externalUrl, visibility }) => {
    if (!attachmentId) {
      throw new Error('attachmentId không hợp lệ');
    }

    const response = await apiClient.put(`/task-attachments/${attachmentId}`, {
      originalName: originalName || undefined,
      externalUrl: externalUrl || undefined,
      visibility: visibility || undefined,
    });
    return response.data;
  },

  deleteTaskAttachment: async (attachmentId) => {
    if (!attachmentId) {
      throw new Error('attachmentId không hợp lệ');
    }

    await apiClient.delete(`/task-attachments/${attachmentId}`);
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

