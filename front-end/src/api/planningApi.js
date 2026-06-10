import apiClient from './apiClient';

const assertEventId = (eventId) => {
  if (!eventId) {
    throw new Error('eventId không hợp lệ');
  }
};

const assertPlanningId = (planningId) => {
  if (!planningId) {
    throw new Error('planningId không hợp lệ');
  }
};

const assertPhaseId = (phaseId) => {
  if (!phaseId) {
    throw new Error('phaseId không hợp lệ');
  }
};

const planningApi = {
  getPlannings: async (eventId) => {
    assertEventId(eventId);
    const response = await apiClient.get(`/events/${eventId}/plannings`);
    return response.data;
  },

  getPlanning: async ({ eventId, planningId }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    const response = await apiClient.get(`/events/${eventId}/plannings/${planningId}`);
    return response.data;
  },

  createPlanning: async ({ eventId, payload }) => {
    assertEventId(eventId);
    const response = await apiClient.post(`/events/${eventId}/plannings`, payload);
    return response.data;
  },

  updatePlanning: async ({ eventId, planningId, payload }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    const response = await apiClient.put(`/events/${eventId}/plannings/${planningId}`, payload);
    return response.data;
  },

  deletePlanning: async ({ eventId, planningId }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    await apiClient.delete(`/events/${eventId}/plannings/${planningId}`);
  },

  createPhase: async ({ eventId, planningId, payload }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    const response = await apiClient.post(`/events/${eventId}/plannings/${planningId}/phases`, payload);
    return response.data;
  },

  updatePhase: async ({ eventId, planningId, phaseId, payload }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    assertPhaseId(phaseId);
    const response = await apiClient.put(`/events/${eventId}/plannings/${planningId}/phases/${phaseId}`, payload);
    return response.data;
  },

  deletePhase: async ({ eventId, planningId, phaseId }) => {
    assertEventId(eventId);
    assertPlanningId(planningId);
    assertPhaseId(phaseId);
    await apiClient.delete(`/events/${eventId}/plannings/${planningId}/phases/${phaseId}`);
  },
};

export default planningApi;
