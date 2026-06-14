import apiClient from './apiClient';

const templateApi = {
  // User/Public endpoints
  getTemplatesPage: async ({
    page = 0,
    size = 10,
    sort = 'createdDate',
    direction = 'desc',
    search,
  } = {}) => {
    const response = await apiClient.get('/events/templates', {
      params: {
        page,
        size,
        sort,
        direction,
        search: search || undefined,
      },
    });
    return response.data;
  },

  getTemplates: async () => {
    const pageResponse = await templateApi.getTemplatesPage({ size: 100 });
    return pageResponse?.content || pageResponse;
  },

  getTemplate: async (templateId) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    const response = await apiClient.get(`/events/templates/${templateId}`);
    return response.data;
  },

  instantiateTemplate: async (templateId, payload) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    const response = await apiClient.post(
      `/events/templates/${templateId}/instantiate`,
      payload
    );
    return response.data;
  },

  // Admin endpoints
  createTemplate: async (payload) => {
    const response = await apiClient.post('/admin/events/templates', payload);
    return response.data;
  },

  updateTemplate: async (templateId, payload) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    const response = await apiClient.put(
      `/admin/events/templates/${templateId}`,
      payload
    );
    return response.data;
  },

  deleteTemplate: async (templateId) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    await apiClient.delete(`/admin/events/templates/${templateId}`);
  },

  // Department management in templates
  addDepartmentToTemplate: async (templateId, payload) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    const response = await apiClient.post(
      `/admin/events/templates/${templateId}/departments`,
      payload
    );
    return response.data;
  },

  updateTemplateDepartment: async (templateId, deptId, payload) => {
    if (!templateId || !deptId) {
      throw new Error('templateId hoặc deptId không hợp lệ');
    }

    const response = await apiClient.put(
      `/admin/events/templates/${templateId}/departments/${deptId}`,
      payload
    );
    return response.data;
  },

  deleteTemplateDepartment: async (templateId, deptId) => {
    if (!templateId || !deptId) {
      throw new Error('templateId hoặc deptId không hợp lệ');
    }

    await apiClient.delete(
      `/admin/events/templates/${templateId}/departments/${deptId}`
    );
  },

  // Task management in templates
  addTaskToTemplate: async (templateId, payload) => {
    if (!templateId) {
      throw new Error('templateId không hợp lệ');
    }

    const response = await apiClient.post(
      `/admin/events/templates/${templateId}/tasks`,
      payload
    );
    return response.data;
  },

  updateTemplateTask: async (templateId, taskId, payload) => {
    if (!templateId || !taskId) {
      throw new Error('templateId hoặc taskId không hợp lệ');
    }

    const response = await apiClient.put(
      `/admin/events/templates/${templateId}/tasks/${taskId}`,
      payload
    );
    return response.data;
  },

  deleteTemplateTask: async (templateId, taskId) => {
    if (!templateId || !taskId) {
      throw new Error('templateId hoặc taskId không hợp lệ');
    }

    await apiClient.delete(
      `/admin/events/templates/${templateId}/tasks/${taskId}`
    );
  },
};

export default templateApi;
