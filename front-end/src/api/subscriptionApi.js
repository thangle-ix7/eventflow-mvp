import apiClient from './apiClient';

const subscriptionApi = {
  getPlans: async () => {
    const response = await apiClient.get('/subscriptions/plans', { skipGlobalErrorRedirect: true });
    return response.data;
  },

  getCurrentSubscription: async () => {
    const response = await apiClient.get('/subscriptions/me');
    return response.data;
  },

  getEventEntitlement: async (eventId) => {
    const response = await apiClient.get(`/subscriptions/events/${eventId}/entitlement`);
    return response.data;
  },

  createCheckout: async (payload) => {
    const response = await apiClient.post('/subscriptions/checkout', payload);
    return response.data;
  },

  previewCheckout: async (payload) => {
    const response = await apiClient.post('/subscriptions/checkout/preview', payload);
    return response.data;
  },

  getDiscountCodes: async () => {
    const response = await apiClient.get('/subscriptions/admin/discount-codes');
    return response.data;
  },

  createDiscountCode: async (payload) => {
    const response = await apiClient.post('/subscriptions/admin/discount-codes', payload);
    return response.data;
  },

  updateDiscountCode: async ({ id, ...payload }) => {
    const response = await apiClient.put(`/subscriptions/admin/discount-codes/${id}`, payload);
    return response.data;
  },

  deactivateDiscountCode: async (id) => {
    await apiClient.delete(`/subscriptions/admin/discount-codes/${id}`);
  },
};

export default subscriptionApi;
