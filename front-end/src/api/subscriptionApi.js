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
};

export default subscriptionApi;
