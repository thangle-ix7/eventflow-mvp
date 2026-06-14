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

  // Admin endpoints (Quản lý bản thân cái Template)
createTemplate: async (payload) => {
    const response = await apiClient.post('/events/admin/templates', payload);
    return response.data;
  },

  updateTemplate: async (templateId, payload) => {
    const response = await apiClient.put(`/events/admin/templates/${templateId}`, payload);
    return response.data;
  },

  deleteTemplate: async (templateId) => {
    await apiClient.delete(`/events/admin/templates/${templateId}`);
  },

  // Phòng ban: ĐỒNG NHẤT VỀ API MỚI
  addDepartmentToTemplate: async (templateId, payload) => {
    return (await apiClient.post(`/events/admin/templates/${templateId}/departments`, payload)).data;
  },

  updateTemplateDepartment: async (templateId, deptId, payload) => {
    return (await apiClient.put(`/events/admin/templates/${templateId}/departments/${deptId}`, payload)).data;
  },

  deleteTemplateDepartment: async (templateId, deptId) => {
    await apiClient.delete(`/events/admin/templates/${templateId}/departments/${deptId}`);
  },

  // Task: ĐỒNG NHẤT VỀ API MỚI
  addTaskToTemplate: async (templateId, payload) => {
    return (await apiClient.post(`/events/admin/templates/${templateId}/tasks`, payload)).data;
  },

  updateTemplateTask: async (templateId, taskId, payload) => {
    return (await apiClient.put(`/events/admin/templates/${templateId}/tasks/${taskId}`, payload)).data;
  },

  deleteTemplateTask: async (templateId, taskId) => {
    await apiClient.delete(`/events/admin/templates/${templateId}/tasks/${taskId}`);
  },
};

export default templateApi;